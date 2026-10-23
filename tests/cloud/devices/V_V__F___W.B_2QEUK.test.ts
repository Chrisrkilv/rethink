import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import DUT from '@/cloud/devices/V_V__F___W.B_2QEUK'
import type { Metadata } from '@/cloud/thinq'
import { MockHAConnection, MockThinq2Device, buf, hex } from '@/tests/helpers/mocks'

const DEVICE_ID = 'test-id'
const MODEL_ID = 'V_V__F___W.B_2QEUK'
const META: Metadata = { modelId: MODEL_ID, modelName: 'V_V__F___W.B_2QEUK', swVersion: '2.11.207' }

// Real frames from a V_V__F___W.B_2QEUK washer/dryer, captured in bridge mode with rethink-capture
// alongside the LG cloud's notifications. The comment on each says what the cloud reported for it.
// All but the first are 0xec pairs: the state being replaced, then the state replacing it.

// Single 0xeb record: INITIAL, nothing selected, TCLCount 47
const SAMPLE_READY = buf(
    'aaff200a0039007b6c000100eb002700000100000000000000000000000000000000000000002f007a00000000000000000000000000d52ebb',
)

// WASHDRY, TEMP_40, SPIN_1400, RINSE_NORMAL, SOILWASH_NORMAL, DRYLEVEL_NORMAL, 6:14
const SAMPLE_WASH_DRY = buf(
    'aaff200a0060007b7f000100ec004e00000100320032180000000000020000000000000600002f007a00000000000000000000000000000001060e060e1300030a0401020000000000000400002f007a000004000000000000000000006414bb',
)

// DRYONLY, then dryLevel changed from DRYLEVEL_NORMAL to DRYLEVEL_LOW on the panel
const SAMPLE_DRY_ONLY_LOW = buf(
    'aaff200a0060007c2e000100ec004e00000100320032180000000000020000000000000600002f007a00000000000000000000000000000001003200321800000000000b0000000000000400002f007a0000000000000000000000000044e6bb',
)

// Turning the dial: each frame is the move onto the course named, as the cloud decoded it
const DIAL = [
    [
        'Cotton',
        'aaff200a0060007c0a000100ec004e000001031d031d0400030a0401000000000000000300002f007a00000200000000000000000000000001030903090100030a0401000000000000000300002f007a000004000000000000000000000060bb',
    ],
    [
        'Easy Care',
        'aaff200a0060007bb2000100ec004e000001000100011700000100000000000000000000007a2f007a00000000000000000000000000000001022302230200030a0401000000000000000300002f007a000003000000000000000000003f42bb',
    ],
    [
        'Eco 40-60',
        'aaff200a0060007bdd000100ec004e00000101060106070003090101000000000000000100002f007a00000300000000000000000000000001031d031d0400030a0401000000000000000300002f007a000002000000000000000000006cf4bb',
    ],
    [
        'Mixed Fabric',
        'aaff200a0060007bcb000100ec004e00000100150015220003010301000000000000000100002f007a00000200000000000000000000000001011a011a070003070401000000000000000200002f007a00000300000000000000000000ca15bb',
    ],
    [
        'Tub Clean',
        'aaff200a0060007ba6000100ec004e000001001c001c1b0003010101000000000000000100002f007a0000030000000000000000000000000101100110120003010601000000000000000300002f007a000002000000000000000000008020bb',
    ],
    [
        'Dry Only',
        'aaff200a0060007b90000100ec004e000001041b041b1300030a0701020000000000000500002f007a0000040000000000000000000000000100320032180000000000020000000000000600002f007a00000000000000000000000000fbcabb',
    ],
    [
        'Wool',
        'aaff200a0060007b93000100ec004e00000100320032180000000000020000000000000600002f007a00000000000000000000000000000001002700271b0003050301000000000000000100002f007a000003000000000000000000002652bb',
    ],
    [
        'Quick 30',
        'aaff200a0060007bc1000100ec004e000001010f010f020003090101000000000000000100002f007a00000300000000000000000000000001001e001e220003050201000000000000000100002f007a000002000000000000000000008b1bbb',
    ],
    // SPINONLY, with the downloaded SPIN course selected
    [
        'Spin only',
        'aaff200a0060007ba8000100ec004e00000101100110120003010601000000000000000300002f007a00000200000000000000000000000001000f000f1700000a00000000000000000001007a2f007a00000000000000000000000000631fbb',
    ],
] as const

// The lock byte on COTTONPLUS, one change at a time: CHILDLOCK_ON, REMOTE_START_ON, DOOR_LOCK_ON
// (the door locks a few seconds after remote start is armed), then REMOTE_START_OFF with the door
// still locked
const SAMPLE_CHILD_LOCK = buf(
    'aaff200a0060007bf3000100ec004e000001030e030e040003010401000000000000000200002f007a00000200000000000000000000000001030e030e040003010401000000008000000200002f007a00000200000000000000000000c0ccbb',
)
const SAMPLE_REMOTE_START = buf(
    'aaff200a0060007bf9000100ec004e000001030e030e040003010401000000000000000200002f007a00000200000000000000000000000001030e030e040003010401000000000200000200002f007a00000200000000000000000000d38fbb',
)
const SAMPLE_REMOTE_START_DOOR_LOCKED = buf(
    'aaff200a0060007bfb000100ec004e000001030e030e040003010401000000000200000200002f007a00000200000000000000000000000001030e030e040003010401000000004200000200002f007a00000200000000000000000000afabbb',
)
const SAMPLE_DOOR_LOCKED = buf(
    'aaff200a0060007c00000100ec004e000001030e030e040003010401000000004200000200002f007a00000200000000000000000000000001030e030e040003010401000000004000000200002f007a00000200000000000000000000d950bb',
)

// reserveTimeHour 3, then 18, the two ends of what the panel offered
const SAMPLE_DELAY_3H = buf(
    'aaff200a0060007c03000100ec004e000001030e030e040003010401000000000000000200002f007a00000200000000000000000000000001030e030e040003010401000300000000000200002f007a000002000000000000000000007850bb',
)
const SAMPLE_DELAY_18H = buf(
    'aaff200a0060007c1b000100ec004e000001030903090100030a0401001000000000000300002f007a00000400000000000000000000000001030903090100030a0401001200000000000300002f007a000004000000000000000000000b0cbb',
)

// A run started from the panel: SPINNING on COTTON at SPIN_800 with no temperature, 11 minutes
const SAMPLE_SPINNING = buf(
    'aaff200a0060007c67000100ec004e000001000b000b010000050000000000004200000000002f007a00000000000000000000000000000008000b000b010000050000000000004200000101002f007a00000000000000000000000000e285bb',
)
// END, remaining 0, door still locked; then DOOR_LOCK_OFF; then POWEROFF with preState END
const SAMPLE_END = buf(
    'aaff200a0060007cec000100ec004e0000080001000b010000050000000000004200000101002f007a00000000000a0000000000000000000a0000000b010000000000000000004000000108002f007a00000000000a000000000000007643bb',
)
const SAMPLE_END_DOOR_UNLOCKED = buf(
    'aaff200a0060007ced000100ec004e00000a0000000b010000000000000000004000000108002f007a00000000000a0000000000000000000a0000000b010000000000000000000000000108002f007a00000000000a00000000000000cfc1bb',
)
const SAMPLE_POWER_OFF = buf(
    'aaff200a0060007cf5000100ec004e00000a0000000b010000000000000000000000000108002f007a00000000000a000000000000000000000000000b01000000000000000000000000000a002f007a00000000000a000000000000006deabb',
)
// PAUSE after the LG app's pause command, in the SPINONLY run before it
const SAMPLE_PAUSED = buf(
    'aaff200a0060007c4d000100ec004e000008000f000f1700000a00000000000042000001017a2f007a00000000000000000000000000000002000f000f1700000a00000000000042000001087a2f007a00000000000000000000000000cd0ebb',
)

// An enveloped frame that is not a state record (inner type 0x03), sent while the dial is turned
const SAMPLE_NOT_STATE = buf(
    'aaff200a003a007c060001010300281e0d01021e00f8000a010000650009000900090068006800160016001300130006060000330000008492bb',
)

// The pause command as the LG app sent it to this washer
const WRITE_PAUSE = 'AA09F02404010099BB'

function makeDevice() {
    const ha = new MockHAConnection()
    const thinq = new MockThinq2Device(DEVICE_ID, META)
    const dev = new DUT(ha.asConnection(), thinq, META)
    return { ha, thinq, dev }
}

describe(MODEL_ID, () => {
    test('a single 0xeb record decodes', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', SAMPLE_READY)
        const props = ha.devices[DEVICE_ID].properties
        assert.equal(props.power, 'ON')
        assert.equal(props.status, 'Ready')
        assert.equal(props.course, 'Not selected')
        assert.equal(props.error_message, 'OK')
        assert.equal(props.cycles, 47)
        assert.equal(props.drying_mode, 'Not selected')
    })

    test('Wash + Dry decodes its settings and drying mode', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', SAMPLE_WASH_DRY)
        const props = ha.devices[DEVICE_ID].properties
        assert.equal(props.status, 'Ready')
        assert.equal(props.course, 'Wash + Dry')
        assert.equal(props.temp, '40 °C')
        assert.equal(props.spin, '1400 rpm')
        assert.equal(props.rinse, 'Normal')
        assert.equal(props.soil, 'Normal')
        assert.equal(props.drying_mode, 'Normal')
        assert.equal(props.initial_time, 6 * 60 + 14)
        assert.equal(props.remaining_time, 6 * 60 + 14)
    })

    test('Dry Only has no wash settings, and its drying mode follows the panel', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', SAMPLE_DRY_ONLY_LOW)
        const props = ha.devices[DEVICE_ID].properties
        assert.equal(props.course, 'Dry Only')
        assert.equal(props.temp, 'Not selected')
        assert.equal(props.spin, 'Not selected')
        assert.equal(props.rinse, 'Not selected')
        assert.equal(props.soil, 'Not selected')
        assert.equal(props.drying_mode, 'Low')
        assert.equal(props.remaining_time, 50)
    })

    test('each dial position decodes to its own course', () => {
        for (const [course, frame] of DIAL) {
            const { ha, thinq } = makeDevice()
            thinq.emit('data', buf(frame))
            assert.equal(ha.devices[DEVICE_ID].properties.course, course)
        }
    })

    test('the downloaded Spin course is reported on its base course', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', buf(DIAL[DIAL.length - 1][1]))
        const props = ha.devices[DEVICE_ID].properties
        assert.equal(props.course, 'Spin only')
        assert.equal(props.smart_course, 'Spin')
    })

    // HA's lock class reads ON as unlocked, hence door_lock and child_lock OFF while locked
    test('the lock byte carries child lock, remote start and the door lock', () => {
        const { ha, thinq } = makeDevice()
        const props = ha.devices[DEVICE_ID].properties

        thinq.emit('data', SAMPLE_CHILD_LOCK)
        assert.equal(props.child_lock, 'OFF')
        assert.equal(props.remote_start, 'OFF')
        assert.equal(props.door_lock, 'ON')

        thinq.emit('data', SAMPLE_REMOTE_START)
        assert.equal(props.child_lock, 'ON')
        assert.equal(props.remote_start, 'ON')
        assert.equal(props.door_lock, 'ON')

        thinq.emit('data', SAMPLE_REMOTE_START_DOOR_LOCKED)
        assert.equal(props.remote_start, 'ON')
        assert.equal(props.door_lock, 'OFF')

        thinq.emit('data', SAMPLE_DOOR_LOCKED)
        assert.equal(props.remote_start, 'OFF')
        assert.equal(props.door_lock, 'OFF')
    })

    test('a delayed end is reported in minutes', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', SAMPLE_DELAY_3H)
        assert.equal(ha.devices[DEVICE_ID].properties.reserve_time, 3 * 60)
        thinq.emit('data', SAMPLE_DELAY_18H)
        assert.equal(ha.devices[DEVICE_ID].properties.reserve_time, 18 * 60)
    })

    test('status follows the washer from spinning to off', () => {
        const { ha, thinq } = makeDevice()
        const props = ha.devices[DEVICE_ID].properties

        thinq.emit('data', SAMPLE_SPINNING)
        assert.equal(props.status, 'Spinning')
        assert.equal(props.course, 'Cotton')
        assert.equal(props.spin, '800 rpm')
        assert.equal(props.temp, 'Not selected')
        assert.equal(props.remaining_time, 11)
        assert.equal(props.door_lock, 'OFF')

        thinq.emit('data', SAMPLE_END)
        assert.equal(props.status, 'End')
        assert.equal(props.remaining_time, 0)
        assert.equal(props.initial_time, 11)
        assert.equal(props.door_lock, 'OFF')

        thinq.emit('data', SAMPLE_END_DOOR_UNLOCKED)
        assert.equal(props.status, 'End')
        assert.equal(props.door_lock, 'ON')

        thinq.emit('data', SAMPLE_POWER_OFF)
        assert.equal(props.status, 'Off')
        assert.equal(props.power, 'OFF')
    })

    test('energy is exposed as the V8 exposes it', () => {
        const { ha } = makeDevice()
        const components = ha.devices[DEVICE_ID].config!.components as Record<string, Record<string, unknown>>
        assert.equal(components.energy.platform, 'sensor')
        assert.equal(components.energy.device_class, 'energy')
        assert.equal(components.energy.state_class, 'total_increasing')
        assert.equal(components.energy.unit_of_measurement, 'Wh')
    })

    test('energy climbs through a run and holds at End and Off', () => {
        const { ha, thinq } = makeDevice()

        thinq.emit('data', SAMPLE_SPINNING)
        assert.equal(ha.getProperty(DEVICE_ID, 'energy', 'state'), 0)

        thinq.emit('data', SAMPLE_END)
        assert.equal(ha.getProperty(DEVICE_ID, 'energy', 'state'), 10)

        thinq.emit('data', SAMPLE_POWER_OFF)
        assert.equal(ha.getProperty(DEVICE_ID, 'energy', 'state'), 10)
    })

    test('paused', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', SAMPLE_PAUSED)
        assert.equal(ha.devices[DEVICE_ID].properties.status, 'Paused')
    })

    // Y_V8_F___W.B_2QEUK would read this as a state record, because byte 8 is 1
    test('an enveloped frame that is not a state record is ignored', () => {
        const { ha, thinq } = makeDevice()
        thinq.emit('data', SAMPLE_WASH_DRY)
        thinq.emit('data', SAMPLE_NOT_STATE)
        const props = ha.devices[DEVICE_ID].properties
        assert.equal(props.status, 'Ready')
        assert.equal(props.course, 'Wash + Dry')
        assert.equal(props.remaining_time, 6 * 60 + 14)
    })

    test('HA pause sends the command the LG app sends', () => {
        const { thinq, dev } = makeDevice()
        thinq.resetRecorder()
        dev.setProperty('pause', '')
        assert.equal(hex(thinq.outbox[0]), WRITE_PAUSE)
    })

    test('the inherited programme controls send nothing', () => {
        const { thinq, dev } = makeDevice()
        thinq.emit('data', SAMPLE_WASH_DRY)
        thinq.resetRecorder()
        dev.setProperty('set_course', 'Cotton')
        dev.setProperty('run_programme', '')
        assert.equal(thinq.outbox.length, 0)
    })
})
