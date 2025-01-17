import type { MissionConditionDataset } from "./main";
import * as astrosure from "./main";


const getDefaultMockLunarLandingConditionData = (unknownDangerLevel: number = 10): MissionConditionDataset<typeof astrosure.lunarLandingScoringModel> => ({
    atmosphericPressure: "low",
    solarWindSpeed: "medium",
    nearbySatellites: "few",
    unknownDangerLevel
});

describe("AstroSure Quoting Engine", () => {
    it("should call calculateMissionScore", async () => {
        const calculateMissionScoreSpy = jest.spyOn(astrosure.MissionScoringService.prototype, "calculateMissionScore")
        await astrosure.createQuote(
            {
                companyName: "NASA",
                policyAmount: 1000000000,
                spaceshipName: "Appolo 11",
                spaceshipSize: "small",
                missionType: "lunar-landing"
            },
            []
        );
        expect(calculateMissionScoreSpy).toHaveBeenCalled();
    });

    it("should approve a quote", async () => {
        jest.spyOn(astrosure.LunarLandingConditionsService.prototype, "getMissionConditions").mockResolvedValueOnce(getDefaultMockLunarLandingConditionData());

        const result = await astrosure.createQuote(
            {
                companyName: "NASA",
                policyAmount: 1000000000,
                spaceshipName: "Appolo 11",
                spaceshipSize: "small",
                missionType: "lunar-landing"
            },
            []
        );

        expect(result).toEqual(
            [
                // Small ship = 0.02 base rate, 
                // 93 mission score = 0.008 rate adjustment
                // 0.028 rate
                // 1000000000 * 0.028 = 28000000
                {
                    companyName: "NASA",
                    policyAmount: 1000000000,
                    spaceshipName: "Appolo 11",
                    spaceshipSize: "small",
                    missionType: "lunar-landing",
                    missionScore: 93,
                    rate: 0.028,
                    premium: 28000000,
                    status: "approved"
                }
            ]
        )
    });

    it("should decline a quote for a dangerous mission", async () => {
        jest.spyOn(astrosure.ShuttleConditionsService.prototype, "getMissionConditions").mockResolvedValueOnce({
            issOrbitalSpeed: "high",
            nearbySatellites: "many",
            unknownDangerLevel: 90
        });

        const result = await astrosure.createQuote(
            {
                companyName: "NASA",
                policyAmount: 1000000000,
                spaceshipName: "Challenger",
                spaceshipSize: "small",
                missionType: "shuttle"
            },
            []
        );

        expect(result).toEqual(
            [
                // Small ship = 0.02 base rate, 
                // 20 mission score = -0.002 rate adjustment
                // 0.018 rate
                // 1000000000 * 0.018 = 18000000
                {
                    companyName: "NASA",
                    policyAmount: 1000000000,
                    spaceshipName: "Challenger",
                    spaceshipSize: "small",
                    missionType: "shuttle",
                    missionScore: 1,
                    rate: 0.018,
                    premium: 18000000,
                    status: "declined"
                }
            ]
        );
    });

    it("should use the appropriate base rate", async () => {
        jest.spyOn(astrosure.MissionScoringService.prototype, "calculateMissionScore").mockResolvedValue(30);
        
        const result = await astrosure.createQuote(
            {
                companyName: "NASA",
                policyAmount: 500000000,
                spaceshipName: "Appolo 12",
                spaceshipSize: "small",
                missionType: "lunar-landing"
            },
            await astrosure.createQuote(
                {
                    companyName: "NASA",
                    policyAmount: 1000000000,
                    spaceshipName: "Appolo 11",
                    spaceshipSize: "large",
                    missionType: "lunar-landing"
                },
                []
            )
        );

        expect(result).toEqual(
            [
                {
                    companyName: "NASA",
                    policyAmount: 1000000000,
                    spaceshipName: "Appolo 11",
                    spaceshipSize: "large",
                    missionType: "lunar-landing",
                    missionScore: 30,
                    rate: 0.03,
                    premium: 30000000,
                    status: "approved"
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
                    status: "approved"
                }
            ]
        );
    });

    it("should apply the appropriate rate adjustments", async () => {
        jest.spyOn(astrosure.MissionScoringService.prototype, "calculateMissionScore").mockResolvedValueOnce(20);
        jest.spyOn(astrosure.MissionScoringService.prototype, "calculateMissionScore").mockResolvedValueOnce(40);
        jest.spyOn(astrosure.MissionScoringService.prototype, "calculateMissionScore").mockResolvedValueOnce(60);

        const result = await astrosure.createQuote(
            {
                companyName: "NASA",
                policyAmount: 250000000,
                spaceshipName: "Appolo 13",
                spaceshipSize: "small",
                missionType: "lunar-landing"
            },
            await astrosure.createQuote(
                {
                    companyName: "NASA",
                    policyAmount: 500000000,
                    spaceshipName: "Appolo 12",
                    spaceshipSize: "small",
                    missionType: "lunar-landing"
                },
                await astrosure.createQuote(
                    {
                        companyName: "NASA",
                        policyAmount: 1000000000,
                        spaceshipName: "Appolo 11",
                        spaceshipSize: "large",
                        missionType: "lunar-landing"
                    },
                    []
                )
            )
        );

        expect(result).toEqual(
            [
                // Large ship = 0.03 base rate, 
                // 20 mission score = -0.002 rate adjustment
                // 0.028 rate
                // 1000000000 * 0.028 = 28000000
                {
                    companyName: "NASA",
                    policyAmount: 1000000000,
                    spaceshipName: "Appolo 11",
                    spaceshipSize: "large",
                    missionType: "lunar-landing",
                    missionScore: 20,
                    rate: 0.028,
                    premium: 28000000,
                    status: "approved"
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
                    status: "approved"
                },
                // Small ship = 0.02 base rate, 
                // 60 mission score = 0.008 rate adjustment
                // 0.028 rate
                // 250000000 * 0.028 = 7000000
                {
                    companyName: "NASA",
                    policyAmount: 250000000,
                    spaceshipName: "Appolo 13",
                    spaceshipSize: "small",
                    missionType: "lunar-landing",
                    missionScore: 60,
                    rate: 0.028,
                    premium: 7000000,
                    status: "approved"
                }
            ]
        );
    });

    it("should decline a quote if there is too much exposure to a single company", async () => {
        jest.spyOn(astrosure.MissionScoringService.prototype, "calculateMissionScore").mockResolvedValueOnce(20);
        jest.spyOn(astrosure.MissionScoringService.prototype, "calculateMissionScore").mockResolvedValueOnce(20);
        jest.spyOn(astrosure.MissionScoringService.prototype, "calculateMissionScore").mockResolvedValueOnce(5);
        jest.spyOn(astrosure.MissionScoringService.prototype, "calculateMissionScore").mockResolvedValueOnce(20);
        jest.spyOn(astrosure.MissionScoringService.prototype, "calculateMissionScore").mockResolvedValueOnce(20);
        jest.spyOn(astrosure.MissionScoringService.prototype, "calculateMissionScore").mockResolvedValueOnce(20);

        const result = await astrosure.createQuote(
            {
                companyName: "NASA",
                policyAmount: 1_000_000_000,
                spaceshipName: "STS-135",
                spaceshipSize: "large",
                missionType: "shuttle"
            },
            await astrosure.createQuote(
                {
                    companyName: "NASA",
                    policyAmount: 1_000_000_000,
                    spaceshipName: "Discovery",
                    spaceshipSize: "small",
                    missionType: "shuttle"
                },
                await astrosure.createQuote(
                    {
                        companyName: "SpaceX",
                        policyAmount: 1_500_000_000,
                        spaceshipName: "Starship",
                        spaceshipSize: "large",
                        missionType: "shuttle"
                    },
                    await astrosure.createQuote(
                        {
                            companyName: "NASA",
                            policyAmount: 500_000_000,
                            spaceshipName: "Challenger",
                            spaceshipSize: "small",
                            missionType: "shuttle"
                        },
                        await astrosure.createQuote(
                            {
                                companyName: "NASA",
                                policyAmount: 500_000_000,
                                spaceshipName: "Appolo 13",
                                spaceshipSize: "small",
                                missionType: "lunar-landing"
                            },
                            await astrosure.createQuote(
                                {
                                    companyName: "SpaceX",
                                    policyAmount: 1_000_000_000,
                                    spaceshipName: "Falcon 9",
                                    spaceshipSize: "small",
                                    missionType: "shuttle"
                                },
                                []
                            )
                        )
                    )
                )
            )
        );

        expect(result).toEqual(
            [
                // Small ship = 0.02 base rate, 
                // 20 mission score = -0.002 rate adjustment
                // 0.018 rate
                // 1000000000 * 0.018 = 18000000
                {
                    companyName: "SpaceX",
                    policyAmount: 1000000000,
                    spaceshipName: "Falcon 9",
                    spaceshipSize: "small",
                    missionType: "shuttle",
                    missionScore: 20,
                    rate: 0.018,
                    premium: 18000000,
                    status: "approved"
                },
                // Small ship = 0.02 base rate, 
                // 20 mission score = -0.002 rate adjustment
                // 0.018 rate
                // 500000000 * 0.018 = 9000000
                {
                    companyName: "NASA",
                    policyAmount: 500000000,
                    spaceshipName: "Appolo 13",
                    spaceshipSize: "small",
                    missionType: "lunar-landing",
                    missionScore: 20,
                    rate: 0.018,
                    premium: 9000000,
                    status: "approved"
                },
                // Small ship = 0.02 base rate, 
                // 5 mission score = -0.002 rate adjustment
                // 0.018 rate
                // 500000000 * 0.018 = 9000000
                {
                    companyName: "NASA",
                    policyAmount: 500000000,
                    spaceshipName: "Challenger",
                    spaceshipSize: "small",
                    missionType: "shuttle",
                    missionScore: 5,
                    rate: 0.018,
                    premium: 9000000,
                    status: "declined"
                },
                // Large ship = 0.03 base rate, 
                // 20 mission score = -0.002 rate adjustment
                // 0.028 rate
                // 1500000000 * 0.028 = 42000000
                {
                    companyName: "SpaceX",
                    policyAmount: 1500000000,
                    spaceshipName: "Starship",
                    spaceshipSize: "large",
                    missionType: "shuttle",
                    missionScore: 20,
                    rate: 0.028,
                    premium: 42000000,
                    status: "declined"
                },
                // Small ship = 0.02 base rate, 
                // 20 mission score = -0.002 rate adjustment
                // 0.018 rate
                // 1000000000 * 0.018 = 18000000
                {
                    companyName: "NASA",
                    policyAmount: 1000000000,
                    spaceshipName: "Discovery",
                    spaceshipSize: "small",
                    missionType: "shuttle",
                    missionScore: 20,
                    rate: 0.018,
                    premium: 18000000,
                    status: "approved"
                },
                // Large ship = 0.04 base rate, 
                // 20 mission score = -0.002 rate adjustment
                // 0.028 rate
                // 1000000000 * 0.028 = 28000000
                {
                    companyName: "NASA",
                    policyAmount: 1000000000,
                    spaceshipName: "STS-135",
                    spaceshipSize: "large",
                    missionType: "shuttle",
                    missionScore: 20,
                    rate: 0.028,
                    premium: 28000000,
                    status: "declined"
                }
            ]
        );
    });

})
