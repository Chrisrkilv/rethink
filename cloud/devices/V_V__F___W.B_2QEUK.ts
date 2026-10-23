import { type ComponentInfo, type Tombstone } from '../homeassistant'
import { allowExtendedType } from '@/util/casting'
import { Enum } from '@/util/enum'
import Y_V8_Y___W_B32QEUK from './Y_V8_Y___W.B32QEUK'

// A washer/dryer combo, "VB F 550 WD 9kg for EU" in its modelJson (firmware clip_hna 2.11.207).
//
// Its 39-byte state record is Y_V8_Y___W.B32QEUK's: course, error, soil, spin, temperature, rinse,
// delayed end, the lock byte, preState, the downloaded course and TCLCount all sit at the same
// offsets, each checked against the LG cloud's own decoding while bridged. The cloud also reports it
// with the same field set (courseFL24inchBaseTitan and friends). It is not Y_V8_F___W.B_2QEUK's
// layout despite the similar model id: here remote start is bit 0x02 of the lock byte and the door
// lock is bit 0x40 of that same byte.
//
// What differs from the V8 washer is the dial, and the drum heater: dryLevel (s[13]) is set here.

// The dial, each position confirmed by turning to it and reading the code it reported. The names
// follow modelJson, which labels COTTONPLUS as Eco 40-60.
export const COURSES = Enum.of({
    'Not selected': 0,
    Cotton: 0x01,
    'Easy Care': 0x02,
    'Eco 40-60': 0x04,
    'Mixed Fabric': 0x07,
    'Tub Clean': 0x12,
    'Wash + Dry': 0x13,
    'Dry Only': 0x18,
    Wool: 0x1b,
    'Quick 30': 0x22,

    // Not a dial position: the base course of the downloaded Spin course, as on the V8
    'Spin only': 0x17,
})

// modelJson's dryLevel, limited to the codes seen from the panel so far
export const DRY_LEVELS = Enum.of({ 'Not selected': 0, Normal: 0x02, Low: 0x0b })

// The inherited entities seen working on this model. Left out until a capture confirms them: the
// option flags (all stayed clear) and the programme controls (no programme command has been sent to
// this model from rethink).
const CONFIRMED = [
    'power',
    'start',
    'pause',
    'status',
    'error',
    'error_message',
    'course',
    'smart_course',
    'temp',
    'spin',
    'rinse',
    'soil',
    'cycles',
    'energy',
    'remote_start',
    'door_lock',
    'child_lock',
    'initial_time',
    'remaining_time',
    'reserve_time',
]

// TODO before offering this upstream, from the next two captures (a heated wash, then a drying run):
// - status: only Off, Ready, Paused, Spinning and End have been seen. Washing (6), Rinsing (7),
//   Drying (9) and Cooling (11) need the cloud's state to read RUNNING, RINSING, DRYING and COOLDOWN
//   while s[2] shows those codes. Delayed (3) needs a wash started with a delayed end, and
//   Measuring (4) the DETECTING state at the start of a wash.
// - energy: s[30..31] climbed from 0 to 10 through a spin run, held at End and Off, and went back to
//   0 when the washer was next switched on, the same behaviour as the V8's counter, so it is
//   published with the V8's unit (Wh). The LG cloud's notifications carry no energy figure, so the
//   unit is still to confirm: one cycle's total within 2% of LG's figure for it, ideally from a
//   heated wash and a drying run.
// - error: only 0 (ERROR_NO) has been seen. The table is modelJson's, which matches ERRORS; one real
//   error code read against the cloud's error field would confirm the byte.
// - options: turboWash, steam, preWash, medicRinse, steamSoftener, creaseCare, wrinkleCare and
//   AIDDLed stayed off throughout. Each needs to be switched on from the panel and seen in s[16],
//   s[17] or s[18] alongside the cloud's flag turning ON.
// - drying_mode: the remaining dryLevel codes, if the drying run uses any.
export default class Device extends Y_V8_Y___W_B32QEUK {
    protected courses() {
        return COURSES
    }

    protected components(): Record<string, ComponentInfo | Tombstone> {
        const inherited = super.components()
        return allowExtendedType({
            ...Object.fromEntries(CONFIRMED.map((key) => [key, inherited[key]])),
            drying_mode: {
                platform: 'sensor',
                unique_id: '$deviceid-drying-mode',
                state_topic: '$this/drying_mode',
                name: 'Drying mode',
                icon: 'mdi:tumble-dryer',
                device_class: 'enum',
                options: DRY_LEVELS.options,
            },
        })
    }

    processState(s: Buffer) {
        super.processState(s)
        this.publishProperty('drying_mode', DRY_LEVELS.map(s[13]))
    }

    // Only the commands every washer here shares; the programme controls stay with the V8 until
    // they are tried on this model
    setProperty(prop: string, mqttValue: string) {
        if (prop === 'power' || prop === 'start' || prop === 'pause') super.setProperty(prop, mqttValue)
    }
}
