export type VolumeStep = {
  absolute: number;
  dB: string;
  percentage: number;
};
export type SoundSink = {
  active: boolean;
  cardName: string;
  description: string;
  index: number;
  name: string;
  state: string;
  volume: Record<string, VolumeStep>;
};

type PACTLSoundSinkPort = {
  availability: "available" | "not available";
  availability_group: string;
  description: string;
  name: string;
  priority: number;
  type: string;
};
type PACTLSoundSinkVolume = {
  db: string;
  value: number;
  value_percent: string;
};
export type PACTLSoundSink = {
  active_port: string;
  balance: number;
  base_volume: {
    db: string;
    value: number;
    value_percent: string;
  };
  channel_map: string;
  description: string;
  driver: string;
  flags: string[];
  formats: string[];
  index: number;
  latency: {
    actual: number;
    configured: number;
  };
  monitor_source: string;
  mute: boolean;
  name: string;
  owner_module: number;
  ports: PACTLSoundSinkPort[];
  priority: Record<string, string>;
  properties: Record<string, string>;
  sample_specification: string;
  state: "SUSPENDED";
  volume: Record<string, PACTLSoundSinkVolume>;
};

export type PACTLSoundSinkInput = {
  balance: number;
  buffer_latency_used: number;
  channel_map: string;
  client: string;
  corked: boolean;
  driver: string;
  format: string;
  index: number;
  mute: boolean;
  owner_module: string;
  properties: Record<string, string>;
  resample_method: string;
  sample_specification: string;
  sink: number;
  sink_latency_used: number;
  volume: Record<string, PACTLSoundSinkVolume>;
};

export type ListSinksResponse = {
  default: string;
  sinks: PACTLSoundSink[];
};

export type RenameBody = {
  name: string;
  sink: string;
};
