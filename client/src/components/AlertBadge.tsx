import { AlertTriangle, AlertCircle, Dna, Network } from 'lucide-react';
import { BreedingAlert } from '../services/api';

interface AlertBadgeProps {
  alerts: BreedingAlert[];
  compact?: boolean;
  onClick?: () => void;
}

export default function AlertBadge({ alerts, compact = false, onClick }: AlertBadgeProps) {
  if (!alerts || alerts.length === 0) return null;

  const dangerCount = alerts.filter((a) => a.severity === 'danger').length;
  const hasDanger = dangerCount > 0;
  const hasInbreeding = alerts.some((a) => a.alertType === 'inbreeding_threshold');
  const hasGenetic = alerts.some((a) => a.alertType === 'genetic_high_risk');

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-default ${
          hasDanger
            ? 'bg-red-100 text-red-700 border border-red-200'
            : 'bg-amber-100 text-amber-700 border border-amber-200'
        } ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
        onClick={onClick}
        title={alerts.map((a) => a.title).join('\n')}
      >
        {hasDanger ? (
          <AlertCircle className="w-3 h-3" />
        ) : (
          <AlertTriangle className="w-3 h-3" />
        )}
        <span>{alerts.length}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {hasInbreeding && (
        <div
          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg font-medium ${
            dangerCount > 0
              ? 'bg-red-50 text-red-700 border border-red-100'
              : 'bg-purple-50 text-purple-700 border border-purple-100'
          }`}
        >
          <Network className="w-3 h-3" />
          <span>近交超标</span>
        </div>
      )}
      {hasGenetic && (
        <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg font-medium bg-rose-50 text-rose-700 border border-rose-100">
          <Dna className="w-3 h-3" />
          <span>高风险基因</span>
        </div>
      )}
    </div>
  );
}

interface PetAlertSummaryProps {
  petId: string;
  affectedPetIds: string[];
  allAlerts?: BreedingAlert[];
}

export function PetAlertSummary({
  petId,
  affectedPetIds,
  allAlerts,
}: PetAlertSummaryProps) {
  if (!affectedPetIds.includes(petId)) return null;

  const petAlerts = allAlerts?.filter((a) => a.petId === petId) || [];
  const hasDanger = petAlerts.some((a) => a.severity === 'danger');

  return (
    <div
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
        hasDanger
          ? 'bg-red-100 text-red-700'
          : 'bg-amber-100 text-amber-700'
      }`}
      title={petAlerts.length > 0 ? petAlerts.map((a) => a.title).join('\n') : '存在繁殖警告'}
    >
      {hasDanger ? (
        <AlertCircle className="w-3 h-3" />
      ) : (
        <AlertTriangle className="w-3 h-3" />
      )}
    </div>
  );
}
