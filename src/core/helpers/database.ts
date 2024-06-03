import {
  Network3Account,
  Network3Device,
  Network3Services,
} from "@prisma/client";

export type PopulatedService = Network3Services & {
  Network3Account: Network3Account & {
    Network3Device: Network3Device;
  };
};

export type FullDevice = Network3Device & {
  accounts: Network3Account[];
};
