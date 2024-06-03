type BorgArchiveStats = {
  compressed_size: number;
  deduplicated_size: number;
  nfiles: number;
  original_size: number;
};

type BorgArchive = {
  /**
   * ### Example
   * ```json
   * [
   *      "borg",
   *      "create",
   *      "--json",
   *      "--list",
   *      "-p",
   *      "-s",
   *      "-C=lz4",
   *      "--exclude-if-present=.nobackup",
   *      "redbud:/growth_rings/borg/graft::graft-2022-11-14-1668565490612",
   *      "/home"
   *  ]
   * ```
   */
  command_line: string[];
  /**
   * In seconds
   */
  duration: number;
  /**
   * date string
   */
  end: string;
  id: string;
  limits: { max_archive_size: number };
  name: string;
  /**
   * date string
   */
  start: string;
  /**
   * ### Example
   * ```json
   * {
   *     "compressed_size": 25103775414,
   *     "deduplicated_size": 3782912,
   *     "nfiles": 1364435,
   *     "original_size": 44394033245
   * }
   * ```
   */
  stats: BorgArchiveStats;
};

type BorgArchiveCacheStats = {
  total_chunks: number;
  total_csize: number;
  total_size: number;
  total_unique_chunks: number;
  unique_csize: number;
  unique_size: number;
};

type BorgArchiveCache = {
  path: string;
  /**
   * ### Example
   * ```json
   * {
   *   "total_chunks": 3628838,
   *   "total_csize": 110794133774,
   *   "total_size": 183437494576,
   *   "total_unique_chunks": 397988,
   *   "unique_csize": 21180670361,
   *   "unique_size": 33385688251
   * }
   * ```
   */
  stats: BorgArchiveCacheStats;
};

type BorgArchiveRepository = {
  id: string;
  /**
   * date string
   */
  last_modified: string;
  location: string;
};

export interface BorgRepoStats {
  archive: BorgArchive;
  cache: BorgArchiveCache;
  encryption: {
    mode: string;
  };
  repository: BorgArchiveRepository;
}
