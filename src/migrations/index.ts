import * as migration_20261002_075129_awal from './20261002_075129_awal';
import * as migration_20261005_041854_pelacakan from './20261005_041854_pelacakan';
import * as migration_20261008_233352_beban_tahfidz from './20261008_233352_beban_tahfidz';
import * as migration_20261009_231518_langganan from './20261009_231518_langganan';
import * as migration_20261009_235813_momen_foto_target from './20261009_235813_momen_foto_target';

export const migrations = [
  {
    up: migration_20261002_075129_awal.up,
    down: migration_20261002_075129_awal.down,
    name: '20261002_075129_awal',
  },
  {
    up: migration_20261005_041854_pelacakan.up,
    down: migration_20261005_041854_pelacakan.down,
    name: '20261005_041854_pelacakan',
  },
  {
    up: migration_20261008_233352_beban_tahfidz.up,
    down: migration_20261008_233352_beban_tahfidz.down,
    name: '20261008_233352_beban_tahfidz',
  },
  {
    up: migration_20261009_231518_langganan.up,
    down: migration_20261009_231518_langganan.down,
    name: '20261009_231518_langganan',
  },
  {
    up: migration_20261009_235813_momen_foto_target.up,
    down: migration_20261009_235813_momen_foto_target.down,
    name: '20261009_235813_momen_foto_target'
  },
];
