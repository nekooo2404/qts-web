import { describe, expect, it } from 'vitest';

import {
  metricUpdateSchema,
  projectUpdateSchema,
  solutionUpdateSchema,
} from '../../src/modules/cms/cms.schema.js';

describe('CMS update schemas', () => {
  it('does not inject create-time defaults into partial project updates', () => {
    expect(projectUpdateSchema.parse({ title: 'Updated SOC' })).toEqual({
      title: 'Updated SOC',
    });
  });

  it('does not inject create-time defaults into partial solution updates', () => {
    expect(solutionUpdateSchema.parse({ problem: 'Updated problem' })).toEqual({
      problem: 'Updated problem',
    });
  });

  it('does not inject status, ordering, or suffix defaults into metric updates', () => {
    expect(metricUpdateSchema.parse({ value: '99.99' })).toEqual({ value: '99.99' });
  });
});
