function main(config) {
	
if (!config.rules) config.rules = [];
if (!config.dns) config.dns = {};
if (!config.dns['fake-ip-filter']) config.dns['fake-ip-filter'] = [];
const localRules = [
"DOMAIN-SUFFIX,localhost,DIRECT",
"DOMAIN-SUFFIX,local,DIRECT",
"IP-CIDR,127.0.0.0/8,DIRECT",
"IP-CIDR,::1/128,DIRECT",
"IP-CIDR,192.168.0.0/16,DIRECT",
"IP-CIDR,10.0.0.0/8,DIRECT",
"IP-CIDR,172.16.0.0/12,DIRECT"
];
	
localRules.forEach(rule => config.rules.unshift(rule));
	
const stabilityRules = [
// 针对 Google AI 及其 API
"AND,((NETWORK,UDP),(DOMAIN-SUFFIX,googleapis.com)),REJECT",
"AND,((NETWORK,UDP),(DOMAIN-SUFFIX,google.com)),REJECT",
"AND,((NETWORK,UDP),(DOMAIN-KEYWORD,google)),REJECT",
// 针对 Copilot (GitHub) - 可选
"AND,((NETWORK,UDP),(DOMAIN-SUFFIX,githubcopilot.com)),REJECT"
];
	
stabilityRules.forEach(rule => config.rules.unshift(rule));
	
config.dns['fake-ip-filter'].push(
'+.localhost',
'+.local',
'*.lan'
);
	
return config;
}
