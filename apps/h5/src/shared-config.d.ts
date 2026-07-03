declare module "@tata/shared-config" {
  export const ACTIVITY_CONFIG: {
    activityId: string;
    environmentLabel: string;
    allowRepeatQuiz: boolean;
    allowRepeatLead: boolean;
    allowRepeatLottery: boolean;
    privacyPolicyUrl: string;
    shareUrl: string;
    mockCities: string[];
    lottery: {
      defaultPrizeName: string;
      poolSize: number;
    };
  };

  export const ASSETS: {
    logo: string;
    silentDayIcon: string;
    posterReference: string;
    products: Record<string, string>;
  };

  export const H5_COPY: {
    loading: { brand: string };
    home: { titleLines: string[]; startButton: string };
    resultLoading: { titleLines: string[]; error: string; retry: string };
    result: { cta: string; shareButtons: string[] };
    poster: { bottomLines: string[]; qrLabel: string };
    share: { title: string; description: string };
    lead: {
      title: string;
      description: string;
      fields: Record<string, { label: string; placeholder: string }>;
      privacy: string;
      submit: string;
      validation: Record<string, string>;
    };
    lottery: { button: string; limitTip: string };
    lotteryResult: {
      title: string;
      description: string;
      resultLabel: string;
      couponTip: string;
      backHome: string;
    };
    system: Record<string, string>;
  };

  export const OPTION_SCORES: Record<string, number>;
  export const QUESTIONS: Array<{
    no: number;
    title: string;
    weight: number;
    options: Array<{ key: string; text: string }>;
  }>;
  export const RESULTS: Array<{
    id: string;
    level: string;
    levelName: string;
    levelDisplay: string;
    title: string;
    scene: string;
    minScore: number;
    maxScore: number;
    description: string;
    productKey: string;
  }>;
}
