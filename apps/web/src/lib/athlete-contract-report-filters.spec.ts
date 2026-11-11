import {
  EMPTY_ATHLETE_CONTRACT_REPORT_FILTERS,
  buildAthleteContractReportBody,
  hasActiveReportFilters,
} from "./athlete-contract-report-filters";

describe("athlete-contract-report-filters", () => {
  it("combina preset e filtros no body sem filtrar localmente", () => {
    const body = buildAthleteContractReportBody(
      "expiring_30",
      {
        ...EMPTY_ATHLETE_CONTRACT_REPORT_FILTERS,
        category: "Sub-20",
        playerId: "p1",
        clubName: "Boston",
      },
      { sortBy: "endDate", sortDir: "asc", offset: 0, limit: 50 },
    );
    expect(body.expirationWindowDays).toBe(30);
    expect(body.category).toBe("Sub-20");
    expect(body.playerId).toBe("p1");
    expect(body.clubName).toBe("Boston");
  });

  it("clear filters — estado vazio", () => {
    expect(hasActiveReportFilters(EMPTY_ATHLETE_CONTRACT_REPORT_FILTERS)).toBe(false);
  });

  it("preset + filtros extras", () => {
    const body = buildAthleteContractReportBody(
      "awaiting_signature",
      {
        ...EMPTY_ATHLETE_CONTRACT_REPORT_FILTERS,
        financialPending: true,
        federativeStatus: "PENDENTE",
      },
      { sortBy: "playerName", sortDir: "desc", offset: 50, limit: 50 },
    );
    expect(body.preset).toBe("awaiting_signature");
    expect(body.financialPending).toBe(true);
    expect(body.federativeStatus).toBe("PENDENTE");
    expect(body.offset).toBe(50);
  });
});
