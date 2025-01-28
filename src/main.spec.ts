import type { MissionConditionDataset, Quote, QuoteRequest } from "./main";
import * as astrosure from "./main";

const getDefaultMockLunarLandingConditionData = (
  unknownDangerLevel: number = 10
): MissionConditionDataset<typeof astrosure.lunarLandingScoringModel> => ({
  atmosphericPressure: "low",
  solarWindSpeed: "medium",
  nearbySatellites: "few",
  unknownDangerLevel,
});

const createAndAccumulateQuote = async (
  request: QuoteRequest,
  existingQuotes: Quote[]
): Promise<Quote[]> => {
  const newQuotes = await astrosure.createQuote(request, existingQuotes);
  return newQuotes;
};

describe("AstroSure Quoting Engine", () => {
  it("should call calculateMissionScore", async () => {
    const calculateMissionScoreSpy = jest.spyOn(
      astrosure.MissionScoringService.prototype,
      "calculateMissionScore"
    );
    await astrosure.createQuote(
      {
        companyName: "NASA",
        policyAmount: 1000000000,
        spaceshipName: "Appolo 11",
        spaceshipSize: "small",
        missionType: "lunar-landing",
      },
      []
    );
    expect(calculateMissionScoreSpy).toHaveBeenCalled();
  });

  it("should approve a quote", async () => {
    jest
      .spyOn(
        astrosure.LunarLandingConditionsService.prototype,
        "getMissionConditions"
      )
      .mockResolvedValueOnce(getDefaultMockLunarLandingConditionData());

    const result = await astrosure.createQuote(
      {
        companyName: "NASA",
        policyAmount: 1000000000,
        spaceshipName: "Appolo 11",
        spaceshipSize: "small",
        missionType: "lunar-landing",
      },
      []
    );

    expect(result).toEqual([
      {
        companyName: "NASA",
        policyAmount: 1000000000,
        spaceshipName: "Appolo 11",
        spaceshipSize: "small",
        missionType: "lunar-landing",
        missionScore: 93,
        rate: 0.028,
        premium: 28000000,
        status: "approved",
      },
    ]);
  });

  it("should decline a quote for a dangerous mission", async () => {
    jest
      .spyOn(
        astrosure.ShuttleConditionsService.prototype,
        "getMissionConditions"
      )
      .mockResolvedValueOnce({
        issOrbitalSpeed: "high",
        nearbySatellites: "many",
        unknownDangerLevel: 90,
      });

    const result = await astrosure.createQuote(
      {
        companyName: "NASA",
        policyAmount: 1000000000,
        spaceshipName: "Challenger",
        spaceshipSize: "small",
        missionType: "shuttle",
      },
      []
    );

    expect(result).toEqual([
      {
        companyName: "NASA",
        policyAmount: 1000000000,
        spaceshipName: "Challenger",
        spaceshipSize: "small",
        missionType: "shuttle",
        missionScore: 1,
        rate: 0.018,
        premium: 18000000,
        status: "declined",
      },
    ]);
  });

  it("should use the appropriate base rate", async () => {
    jest
      .spyOn(astrosure.MissionScoringService.prototype, "calculateMissionScore")
      .mockResolvedValue(30);

    const result = await astrosure.createQuote(
      {
        companyName: "NASA",
        policyAmount: 500000000,
        spaceshipName: "Appolo 12",
        spaceshipSize: "small",
        missionType: "lunar-landing",
      },
      await astrosure.createQuote(
        {
          companyName: "NASA",
          policyAmount: 1000000000,
          spaceshipName: "Appolo 11",
          spaceshipSize: "large",
          missionType: "lunar-landing",
        },
        []
      )
    );

    expect(result).toEqual([
      {
        companyName: "NASA",
        policyAmount: 1000000000,
        spaceshipName: "Appolo 11",
        spaceshipSize: "large",
        missionType: "lunar-landing",
        missionScore: 30,
        rate: 0.03,
        premium: 30000000,
        status: "approved",
      },
      {
        companyName: "NASA",
        policyAmount: 500000000,
        spaceshipName: "Appolo 12",
        spaceshipSize: "small",
        missionType: "lunar-landing",
        missionScore: 30,
        rate: 0.02,
        premium: 10000000,
        status: "approved",
      },
    ]);
  });

  it("should apply the appropriate rate adjustments", async () => {
    jest
      .spyOn(astrosure.MissionScoringService.prototype, "calculateMissionScore")
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(40)
      .mockResolvedValueOnce(60);

    let quoteStorage: Quote[] = [];

    const quoteRequests: QuoteRequest[] = [
      {
        companyName: "NASA",
        policyAmount: 1000000000,
        spaceshipName: "Appolo 11",
        spaceshipSize: "large",
        missionType: "lunar-landing",
      },
      {
        companyName: "NASA",
        policyAmount: 500000000,
        spaceshipName: "Appolo 12",
        spaceshipSize: "small",
        missionType: "lunar-landing",
      },
      {
        companyName: "NASA",
        policyAmount: 250000000,
        spaceshipName: "Appolo 13",
        spaceshipSize: "small",
        missionType: "lunar-landing",
      },
    ];

    for (const request of quoteRequests) {
      quoteStorage = await createAndAccumulateQuote(request, quoteStorage);
    }

    const expectedQuotes: Quote[] = [
      {
        companyName: "NASA",
        policyAmount: 1000000000,
        spaceshipName: "Appolo 11",
        spaceshipSize: "large",
        missionType: "lunar-landing",
        missionScore: 20,
        rate: 0.028,
        premium: 28000000,
        status: "approved",
      },
      {
        companyName: "NASA",
        policyAmount: 500000000,
        spaceshipName: "Appolo 12",
        spaceshipSize: "small",
        missionType: "lunar-landing",
        missionScore: 40,
        rate: 0.02,
        premium: 10000000,
        status: "approved",
      },
      {
        companyName: "NASA",
        policyAmount: 250000000,
        spaceshipName: "Appolo 13",
        spaceshipSize: "small",
        missionType: "lunar-landing",
        missionScore: 60,
        rate: 0.028,
        premium: 7000000,
        status: "approved",
      },
    ];

    expect(quoteStorage).toEqual(expectedQuotes);
  });

  it("should decline a quote if there is too much exposure to a single company", async () => {
    jest
      .spyOn(astrosure.MissionScoringService.prototype, "calculateMissionScore")
      .mockResolvedValueOnce(20) // SpaceX - Falcon 9
      .mockResolvedValueOnce(20) // NASA - Appolo 13
      .mockResolvedValueOnce(5) // NASA - Challenger
      .mockResolvedValueOnce(20) // SpaceX - Starship
      .mockResolvedValueOnce(20) // NASA - Discovery
      .mockResolvedValueOnce(20); // NASA - STS-135

    let quoteStorage: Quote[] = [];

    const quoteRequests: QuoteRequest[] = [
      {
        companyName: "SpaceX",
        policyAmount: 1_000_000_000,
        spaceshipName: "Falcon 9",
        spaceshipSize: "small",
        missionType: "shuttle",
      },
      {
        companyName: "NASA",
        policyAmount: 500_000_000,
        spaceshipName: "Appolo 13",
        spaceshipSize: "small",
        missionType: "lunar-landing",
      },
      {
        companyName: "NASA",
        policyAmount: 500_000_000,
        spaceshipName: "Challenger",
        spaceshipSize: "small",
        missionType: "shuttle",
      },
      {
        companyName: "SpaceX",
        policyAmount: 1_500_000_000,
        spaceshipName: "Starship",
        spaceshipSize: "large",
        missionType: "shuttle",
      },
      {
        companyName: "NASA",
        policyAmount: 1_000_000_000,
        spaceshipName: "Discovery",
        spaceshipSize: "small",
        missionType: "shuttle",
      },
      {
        companyName: "NASA",
        policyAmount: 1_000_000_000,
        spaceshipName: "STS-135",
        spaceshipSize: "large",
        missionType: "shuttle",
      },
    ];

    for (const request of quoteRequests) {
      quoteStorage = await createAndAccumulateQuote(request, quoteStorage);
    }

    const expectedQuotes: Quote[] = [
      {
        companyName: "SpaceX",
        policyAmount: 1_000_000_000,
        spaceshipName: "Falcon 9",
        spaceshipSize: "small",
        missionType: "shuttle",
        missionScore: 20,
        rate: 0.018,
        premium: 18_000_000,
        status: "approved",
      },
      {
        companyName: "NASA",
        policyAmount: 500_000_000,
        spaceshipName: "Appolo 13",
        spaceshipSize: "small",
        missionType: "lunar-landing",
        missionScore: 20,
        rate: 0.018,
        premium: 9_000_000,
        status: "approved",
      },
      {
        companyName: "NASA",
        policyAmount: 500_000_000,
        spaceshipName: "Challenger",
        spaceshipSize: "small",
        missionType: "shuttle",
        missionScore: 5,
        rate: 0.018,
        premium: 9_000_000,
        status: "declined",
      },
      {
        companyName: "SpaceX",
        policyAmount: 1_500_000_000,
        spaceshipName: "Starship",
        spaceshipSize: "large",
        missionType: "shuttle",
        missionScore: 20,
        rate: 0.028,
        premium: 42_000_000,
        status: "declined",
      },
      {
        companyName: "NASA",
        policyAmount: 1_000_000_000,
        spaceshipName: "Discovery",
        spaceshipSize: "small",
        missionType: "shuttle",
        missionScore: 20,
        rate: 0.018,
        premium: 18_000_000,
        status: "approved",
      },
      {
        companyName: "NASA",
        policyAmount: 1_000_000_000,
        spaceshipName: "STS-135",
        spaceshipSize: "large",
        missionType: "shuttle",
        missionScore: 20,
        rate: 0.028,
        premium: 28_000_000,
        status: "declined",
      },
    ];

    expect(quoteStorage).toEqual(expectedQuotes);
  });
});
