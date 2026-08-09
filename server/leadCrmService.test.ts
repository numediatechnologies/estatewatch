import { describe, expect, it } from 'vitest';
import { buildMarketDirectContactPayload, splitContactName } from './leadCrmService';

describe('MarketDirect CRM contact integration', () => {
  it('splits a full contact name and protects a single-name submission', () => {
    expect(splitContactName('  Bongani  Mokoena ')).toEqual({ firstName: 'Bongani', surname: 'Mokoena' });
    expect(splitContactName('EstateWatch')).toEqual({ firstName: 'EstateWatch', surname: 'Contact' });
  });

  it('builds an idempotent follow-up payload with company and priority', () => {
    expect(buildMarketDirectContactPayload({
      name: 'Bongani Mokoena', company: 'MarketDirect', email: 'USER@EXAMPLE.COM', phone: '+27820000000',
      enquiry: 'Admin support', message: 'Please call me back.', submissionId: 'submission-1', followUpPriority: 'high',
    })).toEqual({
      firstName: 'Bongani', surname: 'Mokoena', email: 'USER@EXAMPLE.COM', phoneNumber: '+27820000000',
      product: 'Admin support', message: 'Please call me back.', company: 'MarketDirect', submissionId: 'submission-1', followUpPriority: 'high',
    });
  });
});
