# Network Usage Tracker

Collects network usage by interface and pushes the data to Graphite with StatsD.

## Start at Boot

Add to your crontab with `crontab -e`

```bash
# Network Usage Tracker
@reboot cd /Users/beauraines/projects/network-usage-tracker && npm start
``````