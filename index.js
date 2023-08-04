const dayjs = require('dayjs')
const si = require('systeminformation');
const StatsD = require('node-statsd');


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

async function getNetworkUsage() {
  try {
    const networkStats = await si.networkStats();
    const interfaces = networkStats.filter(
      (interface) => !interface.internal && interface.operstate === 'up'
    );

    const usageData = interfaces.map((interface) => ({
      interface: interface.iface,
      rx_bytes: interface.rx_bytes,
      tx_bytes: interface.tx_bytes,
      date: dayjs().toISOString()
    }));

    return usageData;
  } catch (error) {
    console.error('Error fetching network usage:', error);
    return [];
  }
}

async function logNetworkUsage() {
  const networkUsage = await getNetworkUsage();

  // Log or store the network usage data as you need (e.g., to a database or file).
  //console.log('Network usage data:', networkUsage);
  console.log(JSON.stringify(networkUsage));

  networkUsage.forEach((data) => {
    const metricPrefix = 'network.usage';
    const metricName = `${metricPrefix}.${data.interface}`;

    // Send the data to Graphite via StatsD
    statsdClient.gauge(metricName + '.rx_bytes', data.rx_bytes);
    statsdClient.gauge(metricName + '.tx_bytes', data.tx_bytes);
  });


}

// Call logNetworkUsage() at a regular interval (e.g., every 5 minutes).
logNetworkUsage()
// setInterval(logNetworkUsage, 1 * 30 * 1000); // 30 seconds 
setInterval(logNetworkUsage, 5 * 60 * 1000); // 5 minutes


/**
 * IT MAY MAKE SENSE TO log the difference from the prior period with the gauge...
 * 
 * 
 *  how is the energy value metric being reported at each interval? is it a running "count" metric in
 *  that it increases forever, or does it reset after the report is made at each period? for example 
 * a running count: t=1 v=10, t=2 v=20, t=3 v=30 or a reset count: t=1 v=10, t=2 v=10, t=3 v=10 If the latter, 
 * then a summarize function with the sum aggregation method to a daily/monthly period should work. 
 * or else you might want to use the max aggregation method and some other functions to make it work
 */

