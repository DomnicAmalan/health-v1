/**
 * AnatomyFindingForm Component
 * Form for documenting clinical findings on selected body system
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateAnatomyFinding } from '@/hooks/api/ehr/useAnatomyFindings';
import type { BodySystem } from '@health-v1/shared/types/ehr/anatomy';
import { AlertCircle, Check, X } from 'lucide-react';

const findingSchema = z.object({
  bodySystemId: z.string().uuid(),
  findingType: z.enum(['inspection', 'palpation', 'auscultation', 'percussion']),
  findingCategory: z.enum(['normal', 'abnormal', 'critical']),
  findingText: z.string().min(1, 'Finding text is required').max(10000, 'Maximum 10,000 characters'),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
  laterality: z.enum(['left', 'right', 'bilateral', 'midline']).optional(),
});

type FindingFormData = z.infer<typeof findingSchema>;

interface AnatomyFindingFormProps {
  encounterId: string;
  bodySystem: BodySystem;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AnatomyFindingForm({
  encounterId,
  bodySystem,
  onSuccess,
  onCancel,
}: AnatomyFindingFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const createFinding = useCreateAnatomyFinding(encounterId);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FindingFormData>({
    resolver: zodResolver(findingSchema),
    defaultValues: {
      bodySystemId: bodySystem.id,
      findingType: 'inspection',
      findingCategory: 'normal',
      findingText: '',
    },
  });

  const findingText = watch('findingText');
  const findingCategory = watch('findingCategory');
  const charCount = findingText.length;
  const charLimit = 10000;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await createFinding.mutateAsync({
        bodySystemId: data.bodySystemId,
        findingType: data.findingType,
        findingCategory: data.findingCategory,
        findingText: data.findingText,
        severity: data.severity,
        laterality: data.laterality,
      });
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create anatomy finding:', error);
    }
  });

  const handleTemplateSelect = (template: string) => {
    setSelectedTemplate(template);
    setValue('findingText', template);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Document Finding: {bodySystem.systemName}
          </h3>
          <div
            className="w-6 h-6 rounded-full"
            style={{ backgroundColor: bodySystem.displayColor }}
          />
        </div>
        <p className="text-sm text-gray-600">
          System Code: <span className="font-mono">{bodySystem.systemCode}</span>
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Finding Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Examination Method
          </label>
          <select
            {...register('findingType')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="inspection">Inspection (Visual)</option>
            <option value="palpation">Palpation (Touch)</option>
            <option value="auscultation">Auscultation (Listen)</option>
            <option value="percussion">Percussion (Tap)</option>
          </select>
        </div>

        {/* Finding Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Finding Category *
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['normal', 'abnormal', 'critical'] as const).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setValue('findingCategory', category)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  findingCategory === category
                    ? category === 'critical'
                      ? 'bg-red-500 text-white'
                      : category === 'abnormal'
                      ? 'bg-orange-500 text-white'
                      : 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
          {errors.findingCategory && (
            <p className="mt-1 text-sm text-red-600">{errors.findingCategory.message}</p>
          )}
        </div>

        {/* Quick Templates */}
        {bodySystem.commonFindings.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Templates
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
              {bodySystem.commonFindings.map((template, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleTemplateSelect(template)}
                  className={`text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    selectedTemplate === template
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                  } border`}
                >
                  {template}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Finding Text (Clinical Observation) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Clinical Finding *
          </label>
          <textarea
            {...register('findingText')}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe your clinical observation..."
          />
          <div className="flex items-center justify-between mt-1">
            <div>
              {errors.findingText && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.findingText.message}
                </p>
              )}
            </div>
            <p
              className={`text-sm ${
                charCount > charLimit * 0.9
                  ? 'text-red-600 font-medium'
                  : 'text-gray-500'
              }`}
            >
              {charCount.toLocaleString()} / {charLimit.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Conditional Fields (Abnormal/Critical only) */}
        {findingCategory !== 'normal' && (
          <>
            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity
              </label>
              <select
                {...register('severity')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Not specified</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            </div>

            {/* Laterality */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Laterality
              </label>
              <select
                {...register('laterality')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Not applicable</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="bilateral">Bilateral</option>
                <option value="midline">Midline</option>
              </select>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <X className="h-4 w-4 inline mr-1" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={createFinding.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createFinding.isPending ? (
              <>
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 inline mr-1" />
                Save Finding
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
