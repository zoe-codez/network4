import { TBlackHole, TContext, TServiceParams } from "@digital-alchemy/core";

type DeviceName = keyof typeof PicoIds;

export type PicoEvent<NAME extends DeviceName> = {
  action: "press" | "release";
  area_name: string;
  button_number: number;
  button_type: "off";
  device_id: (typeof PicoIds)[NAME];
  device_name: string;
  leap_button_number: number;
  serial: number;
  type: string;
};

const PicoIds = {
  bed: "ef0352e07ef6a2097606920da7185060",
  bedroom: "f54b4a7cb3a1a3a2f1a14dce0a3c4007",
  //     da8740a55d792593b9d02742c45f4027
  desk: "da8740a55d792593b9d02742c45f4027",
  games: "3be53c3be81021a06b19d2695a26ef24",
  living: "01836b98963c6cb045ae5a445f137aea",
  loft: "cb96c92474a37ea5c9488f5ed0cf734e",
  office: "48df0f0b96b842473701b002b42fe0b9",
  spare: "bd415449f84963177c877d124883535f",
} as const;

export enum Buttons {
  lower = "lower",
  stop = "stop",
  on = "on",
  off = "off",
  raise = "raise",
}

type PicoWatcher = {
  exec: () => TBlackHole;
  match: `${Buttons}`[];
  context: TContext;
};

type PicoBindings = Record<DeviceName, (options: PicoWatcher) => TBlackHole>;

type TEventData<NAME extends DeviceName> = {
  data: PicoEvent<NAME>;
};

export function LutronPicoBindings({ automation, internal }: TServiceParams): PicoBindings {
  function LutronPicoSequenceMatcher<NAME extends DeviceName>(target_device: NAME) {
    return function ({ match, exec, context }: PicoWatcher) {
      return automation.sequence({
        context,
        event_type: "lutron_caseta_button_event",
        exec: async () => {
          await internal.safeExec(async () => await exec());
        },
        filter: ({ data: { device_id, action } }: TEventData<NAME>) => {
          return action === "press" && device_id === PicoIds[target_device];
        },
        label: target_device,
        match,
        path: "data.button_type",
      });
    };
  }
  const names = Object.keys(PicoIds) as DeviceName[];

  return Object.fromEntries(
    names.map(key => [key as DeviceName, LutronPicoSequenceMatcher(key)]),
  ) as PicoBindings;
}
