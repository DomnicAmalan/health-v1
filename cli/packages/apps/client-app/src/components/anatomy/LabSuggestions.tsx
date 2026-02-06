/**
 * LabSuggestions Component
 * Context-aware lab test recommendations based on selected body system
 * Shows recommended tests sorted by relevance score
 */

import { useBodySystemLabRecommendations } from '@/hooks/api/ehr/useBodySystems';
import { FlaskConical, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import type { LabRecommendation } from '@health-v1/shared/types/ehr/anatomy';

interface LabSuggestionsProps {
  bodySystemId: string;
  bodySystemName: string;
  onOrderLab?: (recommendation: LabRecommendation) => void;
}

export function LabSuggestions({
  bodySystemId,
  bodySystemName,
  onOrderLab,
}: LabSuggestionsProps) {
  const { data: labRecommendations, isLoading, error } = useBodySystemLabRecommendations(bodySystemId);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">Failed to load lab recommendations</p>
        </div>
      </div>
    );
  }

  if (!labRecommendations || labRecommendations.recommendations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-blue-600" />
          Suggested Lab Tests
        </h3>
        <p className="text-sm text-gray-600">
          No specific lab test recommendations for {bodySystemName}.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-blue-600" />
          Suggested Lab Tests
        </h3>
        <p className="text-sm text-gray-600">
          Recommended for <span className="font-medium">{bodySystemName}</span>
        </p>
      </div>

      {/* Recommendations List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {labRecommendations.recommendations.map((recommendation) => (
          <LabRecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            onOrder={onOrderLab}
          />
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-4 border-t">
        <p className="text-xs text-gray-500">
          {labRecommendations.recommendations.length} test(s) recommended
          • Sorted by clinical relevance
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface LabRecommendationCardProps {
  recommendation: LabRecommendation;
  onOrder?: (recommendation: LabRecommendation) => void;
}

function LabRecommendationCard({ recommendation, onOrder }: LabRecommendationCardProps) {
  const relevanceScore = Number(recommendation.relevanceScore);
  const relevancePercentage = relevanceScore * 100;

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all">
      {/* Test Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">
            {recommendation.testName || recommendation.panelName}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
              {recommendation.testCode || recommendation.panelCode}
            </span>
            {recommendation.category && (
              <span className="text-xs text-gray-600 bg-blue-50 px-2 py-0.5 rounded">
                {recommendation.category}
              </span>
            )}
            {recommendation.specimenType && (
              <span className="text-xs text-gray-600">
                {recommendation.specimenType}
              </span>
            )}
          </div>
        </div>

        {/* Relevance Score */}
        <div className="flex items-center gap-1 text-sm">
          <TrendingUp className={`h-4 w-4 ${getRelevanceColor(relevanceScore)}`} />
          <span className={`font-medium ${getRelevanceColor(relevanceScore)}`}>
            {relevancePercentage.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Recommendation Reason */}
      <p className="text-sm text-gray-700 mb-3">
        {recommendation.recommendationReason}
      </p>

      {/* Relevance Bar */}
      <div className="mb-3">
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getRelevanceBarColor(relevanceScore)} transition-all`}
            style={{ width: `${relevancePercentage}%` }}
          />
        </div>
      </div>

      {/* Order Button */}
      <button
        onClick={() => onOrder?.(recommendation)}
        className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        <FlaskConical className="h-4 w-4 inline mr-2" />
        Order This Test
      </button>
    </div>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function getRelevanceColor(score: number): string {
  if (score >= 0.9) return 'text-green-600';
  if (score >= 0.75) return 'text-blue-600';
  if (score >= 0.5) return 'text-yellow-600';
  return 'text-gray-600';
}

function getRelevanceBarColor(score: number): string {
  if (score >= 0.9) return 'bg-green-500';
  if (score >= 0.75) return 'bg-blue-500';
  if (score >= 0.5) return 'bg-yellow-500';
  return 'bg-gray-400';
}
