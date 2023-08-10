const si = require('systeminformation');
const StatsD = require('node-statsd');
const { setIntervalAsync } = require('set-interval-async');


statsdHost = process.env.STATSD_HOST || '127.0.0.1' // config.get() will throw an exception if not defined, config.CONFIGNAME will return undefined so I can provide a default
statsdPort = process.env.STATSD_PORT || 8125
statsdAdminPort = process.env.STATSD_ADMIN_PORT || 8126

const statsdConfig = {
  host: statsdHost,
  port: statsdPort,
  adminPort: statsdAdminPort,
  // prefix: statsdPrefix,
  // suffix: statsdSuffix
  // global_tags: ['alpr'],
  // globalize:true
}

const statsdClient = new StatsD(statsdConfig);

const main = async () => {

    let networkStats = await getNetworkStats();
    
    let stats = new Map()

    mapInitialStats(networkStats, stats);

    // wait 1 second
    await sleep(1000) // 1000 ms
    console.log('Waking up')


    networkStats = await getNetworkStats();
    computeAndSendStats(stats, networkStats);
    mapInitialStats(networkStats, stats);


    await sleep(1000) // 1000 ms

    networkStats = await getNetworkStats();
    computeAndSendStats(stats, networkStats);
    mapInitialStats(networkStats, stats);

    setIntervalAsync(async () => {
        await logNetworkUsage(stats)
    }, 1 * 60 * 1000); // 1 minute

}

async function logNetworkUsage(stats) {
    networkStats = await getNetworkStats();
    computeAndSendStats(stats, networkStats);
    mapInitialStats(networkStats, stats);
}

function computeAndSendStats(stats, networkStats) {
    for (const [iface, oldStats] of stats) {
        const newValue = networkStats.filter(s => s.iface == iface)[0];
        let rx_bytes, tx_bytes;
        if (newValue) {
            rx_bytes = newValue.rx_bytes - oldStats.rx_bytes;
            tx_bytes = newValue.tx_bytes - oldStats.tx_bytes;

            sendStats(iface, rx_bytes, tx_bytes);
        }
    }
}

function sendStats(iface, rx_bytes, tx_bytes) {
    const metricPrefix = 'network.usage';
    const metricName = `${metricPrefix}.${iface}`;
    console.log(metricName + '.rx_bytes', rx_bytes);
    console.log(metricName + '.tx_bytes', tx_bytes);
    statsdClient.gauge(metricName + '.rx_bytes', rx_bytes);
    statsdClient.gauge(metricName + '.tx_bytes', tx_bytes);
}

function mapInitialStats(networkStats, stats) {
    networkStats.forEach(s => {
        console.log(s.iface);
        console.log({ rx_bytes: s.rx_bytes, tx_bytes: s.tx_bytes });
        stats.set(s.iface, { rx_bytes: s.rx_bytes, tx_bytes: s.tx_bytes });
    });
}

/**
 * 
 *     [
        {
          iface: 'en7',
          operstate: 'up',
          rx_bytes: 25795572431,
          rx_dropped: 30034,
          rx_errors: 0,
          tx_bytes: 11172352270,
          tx_dropped: 30034,
          tx_errors: 0,
          rx_sec: null,
          tx_sec: null,
          ms: 0
        }
      ]

 * 
 * @returns 
 * 
 * 
 */
async function getNetworkStats() {
    return await si.networkStats();
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


main()