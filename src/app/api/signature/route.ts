import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  // 1. 서버 설정 확인
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Server configuration missing');
    return new Response(JSON.stringify({ message: 'Server configuration missing' }), { status: 500 });
  }

  // 2. 관리자 권한으로 Supabase 클라이언트 생성 (RLS 우회)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    const payload = await request.json();
    
    // [핵심 수정] 클라이언트가 requestId로 보내든 signature_request_id로 보내든 다 받도록 처리
    const requestId = payload.requestId || payload.signature_request_id;
    const signatureData = payload.signatureData;
    const token = payload.token || signatureData?.token || crypto.randomUUID();

    console.log('[Signature API] 요청 수신:', { requestId, hasSignature: !!signatureData?.dataUrl });

    if (!requestId || !signatureData?.dataUrl) {
      console.error('[Signature API] 필수 데이터 누락');
      return new Response(JSON.stringify({ message: 'requestId (contract_id) and signatureData are required' }), { status: 400 });
    }

    const signedAt = new Date().toISOString();
    // IP 주소 로직 안전하게 처리
    const forwardedFor = request.headers.get('x-forwarded-for') || '';
    const ipAddress = forwardedFor.split(',')[0].trim() || 'unknown';

    // 3. Contracts 테이블 업데이트 (상태를 무조건 completed로)
    const contractUpdatePayload = {
      status: 'signed', // 상태 강제 변경
      signed_at: signedAt,
      contract_data: {
        // 기존 데이터 유지를 위해 select를 먼저 하지 않고, jsonb 병합 기능을 활용하거나 
        // 필요한 경우 클라이언트에서 받은 데이터를 신뢰하여 업데이트 (여기서는 기존 로직 유지하되 에러 로깅 강화)
      }
    };

    // 기존 데이터 가져오기 (데이터 병합용)
    const { data: contractRow, error: fetchError } = await supabase
      .from('contracts')
      .select('contract_data')
      .eq('id', requestId)
      .single();

    if (fetchError || !contractRow) {
      console.error('[Signature API] 계약서 찾기 실패:', fetchError);
      return new Response(JSON.stringify({ message: 'Contract not found' }), { status: 404 });
    }

    const mergedContractData = {
      ...contractRow.contract_data,
      signature: {
        name: signatureData.name || '',
        phone: signatureData.phone || '',
        dataUrl: signatureData.dataUrl,
        signedAt,
        ipAddress,
      },
    };

    console.log('[Signature API] Contracts 테이블 업데이트 시도...');
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        status: 'signed',
        signed_at: signedAt,
        contract_data: mergedContractData,
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('[Signature API] Contracts 업데이트 에러:', updateError);
      return new Response(JSON.stringify({ message: `Contract update failed: ${updateError.message}` }), { status: 500 });
    }
    console.log('[Signature API] Contracts 테이블 업데이트 성공!');

    // 4. Signature Requests 테이블 업데이트 (서명 기록)
    const signaturePayload = {
      instructor_signature_url: signatureData.dataUrl,
      status: 'signed',
      signed_at: signedAt,
      ip_address: ipAddress,
    };

    const { data: existingSign, error: signCheckError } = await supabase
      .from('signature_requests')
      .select('id')
      .eq('contract_id', requestId)
      .maybeSingle(); // single() 대신 maybeSingle() 사용이 더 안전함

    let signUpdateError;
    
    if (existingSign) {
       const { error } = await supabase
        .from('signature_requests')
        .update(signaturePayload)
        .eq('contract_id', requestId);
       signUpdateError = error;
    } else {
       const { error } = await supabase
        .from('signature_requests')
        .insert({
          token,
          contract_id: requestId,
          ...signaturePayload,
        });
       signUpdateError = error;
    }

    if (signUpdateError) {
      console.error('[Signature API] 서명 기록 저장 실패 (치명적이지 않음):', signUpdateError);
      // 여기서 에러를 리턴하면 클라이언트는 실패로 인지하므로, Contracts가 업데이트 되었다면 성공으로 처리할 수도 있음.
      // 하지만 데이터 정합성을 위해 에러 리턴 유지.
      return new Response(JSON.stringify({ message: `Signature record failed: ${signUpdateError.message}` }), { status: 500 });
    }

    console.log('[Signature API] 모든 처리 완료.');
    return new Response(JSON.stringify({ ok: true }), { status: 200 });

  } catch (error: any) {
    console.error('[Signature API] 치명적 오류:', error);
    return new Response(JSON.stringify({ message: error?.message || 'Internal Server Error' }), { status: 500 });
  }
}

