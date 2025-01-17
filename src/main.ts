/////////////////
///   Types   ///
/////////////////

// normally I would put the types in a file d.ts but with this I will have
// to change the tsconfig.json file So I preferred not to do it 
// so as not to change the project architecture so much.


export type MissionType = 'lunar-landing' | 'shuttle';

export type SpaceshipSize = 'small' | 'large';

export type Status = 'approved' | 'declined';

export type Scale = "low" | "medium" | "high";

export type Quantity = 'few' | 'many';

export type MissionConditionDataset<TMissionScoringModel extends MissionScoringModel> = {
   [K in keyof TMissionScoringModel]: TMissionScoringModel[K] extends { getScore: (value: infer U) => any } ? U : never
}

export type MissionScoringModel = Record<string, { getScore: (value: any) => number, scoreWeight: number }>

export type QuoteRequest = {
   companyName: string;
   policyAmount: number;
   spaceshipName: string;
   spaceshipSize: SpaceshipSize;
   missionType: MissionType;
}

export type Quote = {
   companyName: string;
   policyAmount: number;
   spaceshipName: string;
   spaceshipSize: SpaceshipSize;
   missionType: MissionType;
   missionScore: number;
   rate: number;
   premium: number;
   status: Status;
}

//////////////////////////////
///   Mission Conditions   ///
//////////////////////////////

export abstract class MissionConditionsService<TMissionScoringModel extends MissionScoringModel> {
    constructor(protected getUnknownDangerLevel: () => Promise<number | undefined>) { }

    abstract getMissionConditions(): Promise<MissionConditionDataset<TMissionScoringModel>>;

    getRandomValue<T>(values: T[]): T {
        return values[Math.floor(Math.random() * values.length)];
    }
}

export class LunarLandingConditionsService extends MissionConditionsService<typeof lunarLandingScoringModel> {
    private constructor(getUnknownDangerLevel: () => Promise<number | undefined>) {
        super(getUnknownDangerLevel);
    }

    async getMissionConditions() {
        return {
            atmosphericPressure: this.getRandomValue(['low', 'medium', 'high'] as Scale[]),
            solarWindSpeed: this.getRandomValue(['low', 'medium', 'high'] as Scale[]),
            nearbySatellites: this.getRandomValue(['few', 'many'] as Quantity[]),
            unknownDangerLevel: await this.getUnknownDangerLevel() ?? 100
        }
    }

    static create(getUnknownDangerLevel: () => Promise<number | undefined>) {
        return new LunarLandingConditionsService(getUnknownDangerLevel);
    }
}

export class ShuttleConditionsService extends MissionConditionsService<typeof shuttleScoringModel> {
    private constructor(getUnknownDangerLevel: () => Promise<number | undefined>) {
        super(getUnknownDangerLevel);
    }

    async getMissionConditions() {
        return {
            issOrbitalSpeed: this.getRandomValue(['low', 'medium', 'high'] as Scale[]),
            nearbySatellites: this.getRandomValue(['few', 'many'] as Quantity[]),
            unknownDangerLevel: await this.getUnknownDangerLevel() ?? 100,
        }
    }

    static create(getUnknownDangerLevel: () => Promise<number | undefined>) {
        return new ShuttleConditionsService(getUnknownDangerLevel);
    }
}

export class MissionConditionsServiceFactory {
    static create(
        missionType: MissionType,
        getUnknownDangerLevel: () => Promise<number | undefined>
    ): MissionConditionsService<(typeof missionScoringModelMap)[typeof missionType]> {
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
        getScore: (value: Scale) => ({
            low: 100,
            medium: 50,
            high: 0,
        }[value]),
        scoreWeight: 0.5,
    },
    solarWindSpeed: {
        getScore: (value: Scale) => ({
            low: 100,
            medium: 80,
            high: 0,
        }[value]),
        scoreWeight: 0.3,
    },
    nearbySatellites: {
        getScore: (value: Quantity) => ({
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
        getScore: (value: Scale) => ({
            low: 100,
            medium: 30,
            high: 0,
        }[value]),
        scoreWeight: 0.8,
    },
    nearbySatellites: {
        getScore: (value: Quantity) => ({
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
    'lunar-landing': lunarLandingScoringModel,
    'shuttle': shuttleScoringModel
};

export class MissionScoringService<TMissionScoringModel extends MissionScoringModel> {
    private constructor(
        private missionScoringModel: TMissionScoringModel,
        private missionConditionsDataService: MissionConditionsService<TMissionScoringModel>
    ) { }

    async calculateMissionScore(): Promise<number> {
        const conditions = await this.missionConditionsDataService.getMissionConditions();

        return Object.keys(conditions).reduce((score, key) => {
            const condition = conditions[key];
            const model = this.missionScoringModel[key];
            return score + model.getScore(condition) * model.scoreWeight;
        }, 0);
    }

    static create<TMissionScoringModel extends MissionScoringModel>(
        missionScoringModel: TMissionScoringModel,
        missionConditionsDataService: MissionConditionsService<TMissionScoringModel>
    ) {
        return new MissionScoringService(missionScoringModel, missionConditionsDataService);
    }
}

export class MissionScoringServiceFactory {
    static create(
        conditionsDataService: MissionConditionsService<MissionScoringModel>
    ) {
        if (conditionsDataService instanceof LunarLandingConditionsService) {
            return MissionScoringService.create(missionScoringModelMap["lunar-landing"], conditionsDataService);
        }

        if (conditionsDataService instanceof ShuttleConditionsService) {
            return MissionScoringService.create(missionScoringModelMap["shuttle"], conditionsDataService);
        }

        throw new Error("Invalid MissionConditionsDataService passed to MissionScoringServiceFactory");
    }
}



////////////////////////////////
///   Unknown Danger Level   ///
////////////////////////////////

export const getUnknownDangerLevelFromThirdParty = async (): Promise<
    number | undefined
> => {
    try {
        const response = await fetch("https://www.randomnumberapi.com/api/v1.0/randomnumber?min=0&max=100&count=1");
        const data = (await response.json()) as number;
        return data;
    } catch (error) {
        console.error("Error fetching unknown danger level:", error);
        return undefined;
    }
};



/////////////////////////////////////
///   Create Quote (Entrypoint)   ///
/////////////////////////////////////

export const createQuote = async (request: QuoteRequest, quoteStorage: Quote[]): Promise<Quote[]> => {
    const conditionsService = MissionConditionsServiceFactory.create(request.missionType, getUnknownDangerLevelFromThirdParty);
    const scoringService = MissionScoringServiceFactory.create(conditionsService);
    const missionScore = await scoringService.calculateMissionScore();

    const calculateRate = (missionScore: number, spaceshipSize: string): number => {
        const baseRate = spaceshipSize === 'small' ? 0.02 : 0.03;
        let rateAdjustment = 0;
        if (missionScore <= 25) rateAdjustment = -0.002;
        if (missionScore > 55) rateAdjustment = 0.008;
        const result =  parseFloat((baseRate + rateAdjustment).toFixed(3));
        return result;
    };

    const calculatePremium = (policyAmount: number, rate: number): number => {
        const result = parseFloat((policyAmount * rate).toFixed(2));
        return result;
    }

    const calculateTotalPolicyAmount = (request: QuoteRequest, quoteStorage: Quote[]): number => {
        return quoteStorage
            .filter(quote => quote.companyName === request.companyName && quote.status === 'approved')
            .reduce((sum, quote) => sum + quote.policyAmount, 0) + request.policyAmount;
    };

    const determineStatus = (missionScore: number, totalPolicyAmount: number): Status => {
        return missionScore <= 15 || totalPolicyAmount > 2000000000 ? 'declined' : 'approved';
    };

    const rate = calculateRate(missionScore, request.spaceshipSize);
    const premium = calculatePremium(request.policyAmount, rate);
    const totalPolicyAmount = calculateTotalPolicyAmount(request, quoteStorage);
    const status = determineStatus(missionScore, totalPolicyAmount);

    const newQuote: Quote = {
        ...request,
        missionScore,
        rate,
        premium,
        status
    };

    return [...quoteStorage, newQuote];
}
