'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type StampUploaderProps = {
  userId: string;
  academyInfo?: {
    academy_name?: string;
    academy_address?: string;
    representative_name?: string;
    contact?: string;
    business_number?: string;
  };
  autoUpload?: boolean;
  label?: string;
  description?: string;
  previewSize?: number;
  onUploaded?: (url: string) => void;
  initialUrl?: string | null;
};

export default function StampUploader({
  userId,
  academyInfo,
  autoUpload = false,
  label,
  description,
  previewSize,
  onUploaded,
  initialUrl,
}: StampUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const labelText = label ?? '학원 직인 업로드';
  const descriptionText = description ?? '계약서에 사용할 직인을 등록해주세요. 등록된 직인은 PDF에 반영됩니다.';
  const previewDimension = previewSize ?? 96;

  const previewUrl = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    if (initialUrl) {
      setImageUrl(initialUrl);
    }
  }, [initialUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    setError(null);

    if (file && autoUpload) {
      void handleUpload(file);
    }
  };

  const handleUpload = async (fileOverride?: File) => {
    if (!userId) return;
    const file = fileOverride || selectedFile;
    if (!file) {
      setError('업로드할 파일을 선택해주세요.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const filePath = `stamps/${userId}/stamp.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('stamps')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || 'image/png',
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from('stamps')
        .getPublicUrl(filePath);

      const publicUrl = publicData.publicUrl;

      const { data: updatedRows, error: updateError } = await supabase
        .from('academy_info')
        .update({ stamp_image_url: publicUrl })
        .eq('user_id', userId)
        .select('id');

      if (updateError) {
        throw updateError;
      }

      if (!updatedRows || updatedRows.length === 0) {
        const academyPayload = academyInfo
          ? {
              user_id: userId,
              stamp_image_url: publicUrl,
              academy_name: academyInfo.academy_name || '',
              academy_address: academyInfo.academy_address || '',
              representative_name: academyInfo.representative_name || '',
              contact: academyInfo.contact || '',
              business_number: academyInfo.business_number || '',
            }
          : {
              user_id: userId,
              stamp_image_url: publicUrl,
            };

        const { error: insertError } = await supabase
          .from('academy_info')
          .insert(academyPayload);

        if (insertError) {
          throw insertError;
        }
      }

      setImageUrl(publicUrl);
      setSelectedFile(null);
      onUploaded?.(publicUrl);
    } catch (err: any) {
      console.error('직인 업로드 실패:', err);
      setError(err?.message || '직인 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">{labelText}</h3>
        <p className="text-sm text-gray-500 mt-1">{descriptionText}</p>
      </div>

      <div className="flex flex-col gap-3">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />
        <button
          type="button"
          onClick={() => handleUpload()}
          disabled={uploading || !selectedFile}
          className="w-full px-4 py-2 rounded-lg bg-navy text-white font-semibold disabled:opacity-50"
        >
          {uploading ? '업로드 중...' : '등록'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {(previewUrl || imageUrl) && (
        <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center space-y-2">
          <p className="text-sm text-gray-500">미리보기</p>
          <img
            src={previewUrl || imageUrl || ''}
            alt="학원 직인"
            crossOrigin="anonymous"
            className="mx-auto object-contain"
            style={{ width: `${previewDimension}px`, height: `${previewDimension}px` }}
          />
        </div>
      )}
    </div>
  );
}

