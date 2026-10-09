export interface ModelRecord {
  id: string;
  task: 'buyer_intent' | 'dealer_assignment';
  version: string;
  featureVersion: string;
  trainedAt: string | null;
  labelledOutcomes: number;
  metrics: { auc?: number; brier?: number } | null;
  status: 'insufficient_data' | 'candidate' | 'production';
}

export interface ModelRegistry {
  models: ModelRecord[];
}

const MIN_LABELS = 200;

export function emptyRegistry(): ModelRegistry {
  return { models: [] };
}

/** Live accounts stay on the rules baseline until enough labelled outcomes exist. Never invent AUC. */
export function resolveScorer(registry: ModelRegistry, task: ModelRecord['task']): {
  mode: 'rules_baseline' | 'registered_model';
  reason: string;
  model: ModelRecord | null;
} {
  const production = registry.models.find((row) => row.task === task && row.status === 'production' && row.labelledOutcomes >= MIN_LABELS && row.trainedAt);
  if (production) {
    return { mode: 'registered_model', reason: `Using ${production.id} trained ${production.trainedAt} on ${production.labelledOutcomes} labelled outcomes.`, model: production };
  }
  const pending = registry.models.filter((row) => row.task === task);
  const labels = pending.reduce((sum, row) => Math.max(sum, row.labelledOutcomes), 0);
  return {
    mode: 'rules_baseline',
    reason: labels < MIN_LABELS
      ? `Enough labelled outcomes nahi hain (${labels}/${MIN_LABELS}). Rules baseline use ho raha hai.`
      : 'A registered production model is not published yet. Rules baseline use ho raha hai.',
    model: null,
  };
}

export function extractIntentTrainingRow(input: {
  buyerId: string;
  features: Record<string, number | boolean>;
  outcome: 'qualified' | 'visit_completed' | 'negotiation' | 'booked' | 'lost' | null;
}) {
  return {
    buyerId: input.buyerId,
    featureVersion: 'intent_features_v1',
    features: input.features,
    label: input.outcome,
    trainable: input.outcome != null,
  };
}
