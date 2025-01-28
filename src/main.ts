/////////////////
///   Types   ///
/////////////////

export type MissionType = "lunar-landing" | "shuttle";

export type MissionConditionDataset<
  TMissionScoringModel extends MissionScoringModel
> = {
  [K in keyof TMissionScoringModel]: TMissionScoringModel[K] extends {
    getScore: (value: infer U) => any;
  }
    ? U
    : never;
};

export type MissionScoringModel = Record<
  string,
  { getScore: (value: any) => number; scoreWeight: number }
>;

export type QuoteRequest = {
  companyName: string;
  policyAmount: number;
  spaceshipName: string;
  spaceshipSize: "small" | "large";
  missionType: MissionType;
};

export type Quote = QuoteRequest & {
  missionScore: number;
  rate: number;
  premium: number;
  status: "approved" | "declined";
};

///////////////////////////
///   Helper Functions  ///
///////////////////////////

/**
 * Determines the base rate based on the spaceship size.
 * @param spaceshipSize - The size of the spaceship ('small' or 'large').
 * @returns The base rate as a decimal.
 */
export const getBaseRate = (spaceshipSize: 'small' | 'large'): number => {
    const baseRates: Record<'small' | 'large', number> = {
        small: 0.02,
        large: 0.03
    };
    return baseRates[spaceshipSize];
};

/**
 * Determines the rate adjustment based on the mission score.
 * @param missionScore - The calculated mission score.
 * @returns The rate adjustment as a decimal.
 */
export const getRateAdjustment = (missionScore: number): number => {
    if (missionScore <= 25) {
        return -0.002; 
    } else if (missionScore > 25 && missionScore <= 55) {
        return 0;      
    } else { 
        return 0.008;
    }
};

/**
 * Determines the status of a quote based on mission score and existing quotes.
 * @param request - The incoming quote request.
 * @param missionScore - The calculated mission score.
 * @param quoteStorage - The existing array of quotes.
 * @returns The status of the quote ('approved' or 'declined').
 */
export const determineQuoteStatus = (
    request: QuoteRequest,
    missionScore: number,
    quoteStorage: Quote[]
): 'approved' | 'declined' => {
    if (missionScore <= 15) {
        return 'declined';
    }

    const totalApprovedPolicyAmount = quoteStorage
        .filter(q => q.companyName === request.companyName && q.status === 'approved')
        .reduce((acc, q) => acc + q.policyAmount, 0);

    if ((totalApprovedPolicyAmount + request.policyAmount) > 2_000_000_000) {
        return 'declined';
    }

    return 'approved';
};

//////////////////////////////
///   Mission Conditions   ///
//////////////////////////////

export abstract class MissionConditionsService<
  TMissionScoringModel extends MissionScoringModel
> {
  constructor(
    protected getUnknownDangerLevel: () => Promise<number | undefined>
  ) {}

  abstract getMissionConditions(): Promise<
    MissionConditionDataset<TMissionScoringModel>
  >;
}

export class LunarLandingConditionsService extends MissionConditionsService<
  typeof lunarLandingScoringModel
> {
  private constructor(
    getUnknownDangerLevel: () => Promise<number | undefined>
  ) {
    super(getUnknownDangerLevel);
  }

  async getMissionConditions() {
    return {
      atmosphericPressure: (["low", "medium", "high"] as const)[
        Math.floor(Math.random() * 3)
      ],
      solarWindSpeed: (["low", "medium", "high"] as const)[
        Math.floor(Math.random() * 3)
      ],
      nearbySatellites: (["few", "many"] as const)[
        Math.floor(Math.random() * 2)
      ],
      unknownDangerLevel: (await this.getUnknownDangerLevel()) ?? 100,
    };
  }

  static create(getUnknownDangerLevel: () => Promise<number | undefined>) {
    return new LunarLandingConditionsService(getUnknownDangerLevel);
  }
}

export class ShuttleConditionsService extends MissionConditionsService<
  typeof shuttleScoringModel
> {
  private constructor(
    getUnknownDangerLevel: () => Promise<number | undefined>
  ) {
    super(getUnknownDangerLevel);
  }

  async getMissionConditions() {
    return {
      issOrbitalSpeed: (["low", "medium", "high"] as const)[
        Math.floor(Math.random() * 3)
      ],
      nearbySatellites: (["few", "many"] as const)[
        Math.floor(Math.random() * 2)
      ],
      unknownDangerLevel: (await this.getUnknownDangerLevel()) ?? 100,
    };
  }

  static create(getUnknownDangerLevel: () => Promise<number | undefined>) {
    return new ShuttleConditionsService(getUnknownDangerLevel);
  }
}

export class MissionConditionsServiceFactory {
  static create(
    missionType: MissionType,
    getUnknownDangerLevel: () => Promise<number | undefined>
  ): MissionConditionsService<
    (typeof missionScoringModelMap)[typeof missionType]
  > {
    switch (missionType) {
      case "lunar-landing":
        return LunarLandingConditionsService.create(getUnknownDangerLevel);
      case "shuttle":
        return ShuttleConditionsService.create(getUnknownDangerLevel);
    }
  }
}

///////////////////////////
///   Mission Scoring   ///
///////////////////////////

export const lunarLandingScoringModel = {
  atmosphericPressure: {
    getScore: (value: "low" | "medium" | "high") =>
      ({
        low: 100,
        medium: 50,
        high: 0,
      }[value]),
    scoreWeight: 0.5,
  },
  solarWindSpeed: {
    getScore: (value: "low" | "medium" | "high") =>
      ({
        low: 100,
        medium: 80,
        high: 0,
      }[value]),
    scoreWeight: 0.3,
  },
  nearbySatellites: {
    getScore: (value: "few" | "many") =>
      ({
        few: 100,
        many: 0,
      }[value]),
    scoreWeight: 0.1,
  },
  unknownDangerLevel: {
    getScore: (value: number) => 100 - value,
    scoreWeight: 0.1,
  },
};

export const shuttleScoringModel = {
  issOrbitalSpeed: {
    getScore: (value: "low" | "medium" | "high") =>
      ({
        low: 100,
        medium: 30,
        high: 0,
      }[value]),
    scoreWeight: 0.8,
  },
  nearbySatellites: {
    getScore: (value: "few" | "many") =>
      ({
        few: 100,
        many: 0,
      }[value]),
    scoreWeight: 0.1,
  },
  unknownDangerLevel: {
    getScore: (value: number) => 100 - value,
    scoreWeight: 0.1,
  },
};

export const missionScoringModelMap = {
  "lunar-landing": lunarLandingScoringModel,
  shuttle: shuttleScoringModel,
};

export class MissionScoringService<
  TMissionScoringModel extends MissionScoringModel
> {
  private constructor(
    private missionScoringModel: TMissionScoringModel,
    private missionConditionsDataService: MissionConditionsService<TMissionScoringModel>
  ) {}

  async calculateMissionScore(): Promise<number> {
    const conditions =
      await this.missionConditionsDataService.getMissionConditions();

    let totalScore = 0;
    for (const key in this.missionScoringModel) {
      const conditionKey = key as keyof TMissionScoringModel;
      const conditionValue = conditions[conditionKey];
      const scoreInfo = this.missionScoringModel[conditionKey];

      const score = scoreInfo.getScore(conditionValue);

      totalScore += score * scoreInfo.scoreWeight;
    }

    return totalScore;
  }

  static create<TMissionScoringModel extends MissionScoringModel>(
    missionScoringModel: TMissionScoringModel,
    missionConditionsDataService: MissionConditionsService<TMissionScoringModel>
  ) {
    return new MissionScoringService(
      missionScoringModel,
      missionConditionsDataService
    );
  }
}

export class MissionScoringServiceFactory {
  static create(
    conditionsDataService: MissionConditionsService<MissionScoringModel>
  ) {
    if (conditionsDataService instanceof LunarLandingConditionsService) {
      return MissionScoringService.create(
        missionScoringModelMap["lunar-landing"],
        conditionsDataService
      );
    }

    if (conditionsDataService instanceof ShuttleConditionsService) {
      return MissionScoringService.create(
        missionScoringModelMap["shuttle"],
        conditionsDataService
      );
    }

    throw new Error(
      "Invalid MissionConditionsDataService passed to MissionScoringServiceFactory"
    );
  }
}

////////////////////////////////
///   Unknown Danger Level   ///
////////////////////////////////

export const getUnknownDangerLevelFromThirdParty = async (): Promise<
  number | undefined
> => {
  try {
    const response = await fetch(
      "https://www.randomnumberapi.com/api/v1.0/randomnumber?min=0&max=100&count=1"
    );
    if (!response.ok) {
      console.error(
        "Failed to fetch unknown danger level:",
        response.statusText
      );
      return undefined;
    }
    const data = await response.json();

    if (Array.isArray(data) && typeof data[0] === "number") {
      return data[0];
    } else {
      console.error("Invalid data format received:", data);
      return undefined;
    }
  } catch (error) {
    console.error("Error fetching unknown danger level:", error);
    return undefined;
  }
};

/////////////////////////////////////
///   Create Quote (Entrypoint)   ///
/////////////////////////////////////

/**
 * Creates a new insurance quote based on the request and existing quotes.
 * @param request - The incoming quote request.
 * @param quoteStorage - The existing array of quotes.
 * @returns A new array of quotes including the newly created quote.
 */
export const createQuote = async (
  request: QuoteRequest,
  quoteStorage: Quote[]
): Promise<Quote[]> => {
  const conditionsService = MissionConditionsServiceFactory.create(
    request.missionType,
    getUnknownDangerLevelFromThirdParty
  );

  const scoringService = MissionScoringServiceFactory.create(conditionsService);

  const missionScore = await scoringService.calculateMissionScore();

  const baseRate = getBaseRate(request.spaceshipSize);

  const rateAdjustment = getRateAdjustment(missionScore);
  const finalRate = parseFloat((baseRate + rateAdjustment).toFixed(3)); 

  const premium = Math.round(request.policyAmount * finalRate); 

  const status = determineQuoteStatus(request, missionScore, quoteStorage);

  
  const newQuote: Quote = {
    ...request,
    missionScore,
    rate: parseFloat(finalRate.toFixed(3)),
    premium,
    status,
  };

  
  return [...quoteStorage, newQuote];
};
