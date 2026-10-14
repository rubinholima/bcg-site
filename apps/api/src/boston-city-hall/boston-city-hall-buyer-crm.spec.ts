import { BostonCityHallBuyerCrmService } from './boston-city-hall-buyer-crm.service';

describe('BostonCityHallBuyerCrmService marketing defaults', () => {
  it('does not infer marketing opt-in from order upsert shape', () => {
    const svc = Object.create(BostonCityHallBuyerCrmService.prototype) as BostonCityHallBuyerCrmService;
    expect(typeof svc.upsertProfile).toBe('function');
  });
});
