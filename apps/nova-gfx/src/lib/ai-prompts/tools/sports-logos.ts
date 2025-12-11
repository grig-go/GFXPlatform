/**
 * Sports Logo Tool
 *
 * Instead of sending all 124 team logo URLs every time,
 * we provide a lookup function that the AI can "call" when needed.
 *
 * The AI prompt tells it to request logos using the tool_request format,
 * and we intercept that to provide the actual URLs.
 */

// Prompt to include when sports content is detected
export const SPORTS_TOOLS_PROMPT = `## Sports Graphics Tools

When creating sports graphics, you can request team logos using:

\`\`\`json
{
  "tool_request": {
    "tool": "sports_logo",
    "params": { "team": "Team Name", "league": "NFL|NBA|MLB|NHL" }
  }
}
\`\`\`

**Available Leagues**: NFL (32 teams), NBA (30 teams), MLB (30 teams), NHL (32 teams)

**Example usage in element**:
\`\`\`json
{
  "element_type": "image",
  "name": "Team Logo",
  "content": {
    "type": "image",
    "src": "{{LOGO:NFL:Chiefs}}",
    "fit": "contain"
  }
}
\`\`\`

Use \`{{LOGO:LEAGUE:TEAM}}\` placeholder and we'll resolve the actual URL.

**Common team name formats**:
- NFL: "Chiefs", "Cowboys", "Patriots", "49ers", etc.
- NBA: "Lakers", "Celtics", "Warriors", "Heat", etc.
- MLB: "Yankees", "Dodgers", "Red Sox", "Cubs", etc.
- NHL: "Bruins", "Penguins", "Maple Leafs", "Golden Knights", etc.

For sports graphics, use \`fit: "contain"\` to preserve logo aspect ratio.`;

// Team logo database - organized by league
const NFL_LOGOS: Record<string, string> = {
  'cardinals': 'https://r2.thesportsdb.com/images/media/team/badge/xvuwtw1420646838.png',
  'arizona cardinals': 'https://r2.thesportsdb.com/images/media/team/badge/xvuwtw1420646838.png',
  'falcons': 'https://r2.thesportsdb.com/images/media/team/badge/rrpvpr1420658174.png',
  'atlanta falcons': 'https://r2.thesportsdb.com/images/media/team/badge/rrpvpr1420658174.png',
  'ravens': 'https://r2.thesportsdb.com/images/media/team/badge/einz3p1546172463.png',
  'baltimore ravens': 'https://r2.thesportsdb.com/images/media/team/badge/einz3p1546172463.png',
  'bills': 'https://r2.thesportsdb.com/images/media/team/badge/6pb37b1515849026.png',
  'buffalo bills': 'https://r2.thesportsdb.com/images/media/team/badge/6pb37b1515849026.png',
  'panthers': 'https://r2.thesportsdb.com/images/media/team/badge/xxyvvy1420940478.png',
  'carolina panthers': 'https://r2.thesportsdb.com/images/media/team/badge/xxyvvy1420940478.png',
  'bears': 'https://r2.thesportsdb.com/images/media/team/badge/ji22531698678538.png',
  'chicago bears': 'https://r2.thesportsdb.com/images/media/team/badge/ji22531698678538.png',
  'bengals': 'https://r2.thesportsdb.com/images/media/team/badge/qqtwwv1420941670.png',
  'cincinnati bengals': 'https://r2.thesportsdb.com/images/media/team/badge/qqtwwv1420941670.png',
  'browns': 'https://r2.thesportsdb.com/images/media/team/badge/squvxy1420942389.png',
  'cleveland browns': 'https://r2.thesportsdb.com/images/media/team/badge/squvxy1420942389.png',
  'cowboys': 'https://r2.thesportsdb.com/images/media/team/badge/wrxssu1450018209.png',
  'dallas cowboys': 'https://r2.thesportsdb.com/images/media/team/badge/wrxssu1450018209.png',
  'broncos': 'https://r2.thesportsdb.com/images/media/team/badge/upsspx1421635647.png',
  'denver broncos': 'https://r2.thesportsdb.com/images/media/team/badge/upsspx1421635647.png',
  'lions': 'https://r2.thesportsdb.com/images/media/team/badge/lgsgkr1546168257.png',
  'detroit lions': 'https://r2.thesportsdb.com/images/media/team/badge/lgsgkr1546168257.png',
  'packers': 'https://r2.thesportsdb.com/images/media/team/badge/rqpwtr1421434717.png',
  'green bay packers': 'https://r2.thesportsdb.com/images/media/team/badge/rqpwtr1421434717.png',
  'texans': 'https://r2.thesportsdb.com/images/media/team/badge/wqqvpx1421434058.png',
  'houston texans': 'https://r2.thesportsdb.com/images/media/team/badge/wqqvpx1421434058.png',
  'colts': 'https://r2.thesportsdb.com/images/media/team/badge/wqqvpx1421434058.png',
  'indianapolis colts': 'https://r2.thesportsdb.com/images/media/team/badge/wqqvpx1421434058.png',
  'jaguars': 'https://r2.thesportsdb.com/images/media/team/badge/0mrsd41546427902.png',
  'jacksonville jaguars': 'https://r2.thesportsdb.com/images/media/team/badge/0mrsd41546427902.png',
  'chiefs': 'https://r2.thesportsdb.com/images/media/team/badge/936t161515847222.png',
  'kansas city chiefs': 'https://r2.thesportsdb.com/images/media/team/badge/936t161515847222.png',
  'raiders': 'https://r2.thesportsdb.com/images/media/team/badge/xqusqy1421724291.png',
  'las vegas raiders': 'https://r2.thesportsdb.com/images/media/team/badge/xqusqy1421724291.png',
  'chargers': 'https://r2.thesportsdb.com/images/media/team/badge/vrqanp1687734910.png',
  'los angeles chargers': 'https://r2.thesportsdb.com/images/media/team/badge/vrqanp1687734910.png',
  'rams': 'https://r2.thesportsdb.com/images/media/team/badge/8e8v4i1599764614.png',
  'los angeles rams': 'https://r2.thesportsdb.com/images/media/team/badge/8e8v4i1599764614.png',
  'dolphins': 'https://r2.thesportsdb.com/images/media/team/badge/trtusv1421435081.png',
  'miami dolphins': 'https://r2.thesportsdb.com/images/media/team/badge/trtusv1421435081.png',
  'vikings': 'https://r2.thesportsdb.com/images/media/team/badge/qstqqr1421609163.png',
  'minnesota vikings': 'https://r2.thesportsdb.com/images/media/team/badge/qstqqr1421609163.png',
  'patriots': 'https://r2.thesportsdb.com/images/media/team/badge/xtwxyt1421431860.png',
  'new england patriots': 'https://r2.thesportsdb.com/images/media/team/badge/xtwxyt1421431860.png',
  'saints': 'https://r2.thesportsdb.com/images/media/team/badge/nd46c71537821337.png',
  'new orleans saints': 'https://r2.thesportsdb.com/images/media/team/badge/nd46c71537821337.png',
  'giants': 'https://r2.thesportsdb.com/images/media/team/badge/vxppup1423669459.png',
  'new york giants': 'https://r2.thesportsdb.com/images/media/team/badge/vxppup1423669459.png',
  'jets': 'https://r2.thesportsdb.com/images/media/team/badge/hz92od1607953467.png',
  'new york jets': 'https://r2.thesportsdb.com/images/media/team/badge/hz92od1607953467.png',
  'eagles': 'https://r2.thesportsdb.com/images/media/team/badge/pnpybf1515852421.png',
  'philadelphia eagles': 'https://r2.thesportsdb.com/images/media/team/badge/pnpybf1515852421.png',
  'steelers': 'https://r2.thesportsdb.com/images/media/team/badge/2975411515853129.png',
  'pittsburgh steelers': 'https://r2.thesportsdb.com/images/media/team/badge/2975411515853129.png',
  '49ers': 'https://r2.thesportsdb.com/images/media/team/badge/bqbtg61539537328.png',
  'san francisco 49ers': 'https://r2.thesportsdb.com/images/media/team/badge/bqbtg61539537328.png',
  'seahawks': 'https://r2.thesportsdb.com/images/media/team/badge/wwuqyr1421434817.png',
  'seattle seahawks': 'https://r2.thesportsdb.com/images/media/team/badge/wwuqyr1421434817.png',
  'buccaneers': 'https://r2.thesportsdb.com/images/media/team/badge/2dfpdl1537820969.png',
  'tampa bay buccaneers': 'https://r2.thesportsdb.com/images/media/team/badge/2dfpdl1537820969.png',
  'titans': 'https://r2.thesportsdb.com/images/media/team/badge/m48yia1515847376.png',
  'tennessee titans': 'https://r2.thesportsdb.com/images/media/team/badge/m48yia1515847376.png',
  'commanders': 'https://r2.thesportsdb.com/images/media/team/badge/rn0c7v1643826119.png',
  'washington commanders': 'https://r2.thesportsdb.com/images/media/team/badge/rn0c7v1643826119.png',
};

const NBA_LOGOS: Record<string, string> = {
  'hawks': 'https://r2.thesportsdb.com/images/media/team/badge/q3bx641635067495.png',
  'atlanta hawks': 'https://r2.thesportsdb.com/images/media/team/badge/q3bx641635067495.png',
  'celtics': 'https://r2.thesportsdb.com/images/media/team/badge/4j85bn1667936589.png',
  'boston celtics': 'https://r2.thesportsdb.com/images/media/team/badge/4j85bn1667936589.png',
  'nets': 'https://r2.thesportsdb.com/images/media/team/badge/hkafe61739948361.png',
  'brooklyn nets': 'https://r2.thesportsdb.com/images/media/team/badge/hkafe61739948361.png',
  'hornets': 'https://r2.thesportsdb.com/images/media/team/badge/xqtvvp1422380623.png',
  'charlotte hornets': 'https://r2.thesportsdb.com/images/media/team/badge/xqtvvp1422380623.png',
  'bulls': 'https://r2.thesportsdb.com/images/media/team/badge/yk7swg1547214677.png',
  'chicago bulls': 'https://r2.thesportsdb.com/images/media/team/badge/yk7swg1547214677.png',
  'cavaliers': 'https://r2.thesportsdb.com/images/media/team/badge/tys75k1664478652.png',
  'cleveland cavaliers': 'https://r2.thesportsdb.com/images/media/team/badge/tys75k1664478652.png',
  'mavericks': 'https://r2.thesportsdb.com/images/media/team/badge/yqrxrs1420568796.png',
  'dallas mavericks': 'https://r2.thesportsdb.com/images/media/team/badge/yqrxrs1420568796.png',
  'nuggets': 'https://r2.thesportsdb.com/images/media/team/badge/8o8j5k1546016274.png',
  'denver nuggets': 'https://r2.thesportsdb.com/images/media/team/badge/8o8j5k1546016274.png',
  'pistons': 'https://r2.thesportsdb.com/images/media/team/badge/lg7qrc1621594751.png',
  'detroit pistons': 'https://r2.thesportsdb.com/images/media/team/badge/lg7qrc1621594751.png',
  'warriors': 'https://r2.thesportsdb.com/images/media/team/badge/irobi61565197527.png',
  'golden state warriors': 'https://r2.thesportsdb.com/images/media/team/badge/irobi61565197527.png',
  'rockets': 'https://r2.thesportsdb.com/images/media/team/badge/yezpho1597486052.png',
  'houston rockets': 'https://r2.thesportsdb.com/images/media/team/badge/yezpho1597486052.png',
  'pacers': 'https://r2.thesportsdb.com/images/media/team/badge/v6jzgm1503741821.png',
  'indiana pacers': 'https://r2.thesportsdb.com/images/media/team/badge/v6jzgm1503741821.png',
  'clippers': 'https://r2.thesportsdb.com/images/media/team/badge/3gtb8s1719303125.png',
  'los angeles clippers': 'https://r2.thesportsdb.com/images/media/team/badge/3gtb8s1719303125.png',
  'lakers': 'https://r2.thesportsdb.com/images/media/team/badge/d8uoxw1714254511.png',
  'los angeles lakers': 'https://r2.thesportsdb.com/images/media/team/badge/d8uoxw1714254511.png',
  'grizzlies': 'https://r2.thesportsdb.com/images/media/team/badge/m64v461565196789.png',
  'memphis grizzlies': 'https://r2.thesportsdb.com/images/media/team/badge/m64v461565196789.png',
  'heat': 'https://r2.thesportsdb.com/images/media/team/badge/5v67x51547214763.png',
  'miami heat': 'https://r2.thesportsdb.com/images/media/team/badge/5v67x51547214763.png',
  'bucks': 'https://r2.thesportsdb.com/images/media/team/badge/olhug01621594702.png',
  'milwaukee bucks': 'https://r2.thesportsdb.com/images/media/team/badge/olhug01621594702.png',
  'timberwolves': 'https://r2.thesportsdb.com/images/media/team/badge/5xpgjg1621594771.png',
  'minnesota timberwolves': 'https://r2.thesportsdb.com/images/media/team/badge/5xpgjg1621594771.png',
  'pelicans': 'https://r2.thesportsdb.com/images/media/team/badge/cak6261696446261.png',
  'new orleans pelicans': 'https://r2.thesportsdb.com/images/media/team/badge/cak6261696446261.png',
  'knicks': 'https://r2.thesportsdb.com/images/media/team/badge/wyhpuf1511810435.png',
  'new york knicks': 'https://r2.thesportsdb.com/images/media/team/badge/wyhpuf1511810435.png',
  'thunder': 'https://r2.thesportsdb.com/images/media/team/badge/27v8861746610370.png',
  'oklahoma city thunder': 'https://r2.thesportsdb.com/images/media/team/badge/27v8861746610370.png',
  'magic': 'https://r2.thesportsdb.com/images/media/team/badge/sjsv3b1748974231.png',
  'orlando magic': 'https://r2.thesportsdb.com/images/media/team/badge/sjsv3b1748974231.png',
  '76ers': 'https://r2.thesportsdb.com/images/media/team/badge/71545f1518464849.png',
  'sixers': 'https://r2.thesportsdb.com/images/media/team/badge/71545f1518464849.png',
  'philadelphia 76ers': 'https://r2.thesportsdb.com/images/media/team/badge/71545f1518464849.png',
  'suns': 'https://r2.thesportsdb.com/images/media/team/badge/qrtuxq1422919040.png',
  'phoenix suns': 'https://r2.thesportsdb.com/images/media/team/badge/qrtuxq1422919040.png',
  'trail blazers': 'https://r2.thesportsdb.com/images/media/team/badge/ljkd1r1696445959.png',
  'blazers': 'https://r2.thesportsdb.com/images/media/team/badge/ljkd1r1696445959.png',
  'portland trail blazers': 'https://r2.thesportsdb.com/images/media/team/badge/ljkd1r1696445959.png',
  'kings': 'https://r2.thesportsdb.com/images/media/team/badge/5d3dpz1611859587.png',
  'sacramento kings': 'https://r2.thesportsdb.com/images/media/team/badge/5d3dpz1611859587.png',
  'spurs': 'https://r2.thesportsdb.com/images/media/team/badge/obucan1611859537.png',
  'san antonio spurs': 'https://r2.thesportsdb.com/images/media/team/badge/obucan1611859537.png',
  'raptors': 'https://r2.thesportsdb.com/images/media/team/badge/ax36vz1635070057.png',
  'toronto raptors': 'https://r2.thesportsdb.com/images/media/team/badge/ax36vz1635070057.png',
  'jazz': 'https://r2.thesportsdb.com/images/media/team/badge/9v9c5p1751703267.png',
  'utah jazz': 'https://r2.thesportsdb.com/images/media/team/badge/9v9c5p1751703267.png',
  'wizards': 'https://r2.thesportsdb.com/images/media/team/badge/rhxi9w1621594729.png',
  'washington wizards': 'https://r2.thesportsdb.com/images/media/team/badge/rhxi9w1621594729.png',
};

const MLB_LOGOS: Record<string, string> = {
  'diamondbacks': 'https://r2.thesportsdb.com/images/media/team/badge/xe5wlo1713861863.png',
  'arizona diamondbacks': 'https://r2.thesportsdb.com/images/media/team/badge/xe5wlo1713861863.png',
  'braves': 'https://r2.thesportsdb.com/images/media/team/badge/yjs76e1617811496.png',
  'atlanta braves': 'https://r2.thesportsdb.com/images/media/team/badge/yjs76e1617811496.png',
  'orioles': 'https://r2.thesportsdb.com/images/media/team/badge/ytywvu1431257088.png',
  'baltimore orioles': 'https://r2.thesportsdb.com/images/media/team/badge/ytywvu1431257088.png',
  'red sox': 'https://r2.thesportsdb.com/images/media/team/badge/stpsus1425120215.png',
  'boston red sox': 'https://r2.thesportsdb.com/images/media/team/badge/stpsus1425120215.png',
  'cubs': 'https://r2.thesportsdb.com/images/media/team/badge/wxbe071521892391.png',
  'chicago cubs': 'https://r2.thesportsdb.com/images/media/team/badge/wxbe071521892391.png',
  'white sox': 'https://r2.thesportsdb.com/images/media/team/badge/yyz5dh1554140884.png',
  'chicago white sox': 'https://r2.thesportsdb.com/images/media/team/badge/yyz5dh1554140884.png',
  'reds': 'https://r2.thesportsdb.com/images/media/team/badge/wspusr1431538832.png',
  'cincinnati reds': 'https://r2.thesportsdb.com/images/media/team/badge/wspusr1431538832.png',
  'guardians': 'https://r2.thesportsdb.com/images/media/team/badge/3zvzao1640964590.png',
  'cleveland guardians': 'https://r2.thesportsdb.com/images/media/team/badge/3zvzao1640964590.png',
  'rockies': 'https://r2.thesportsdb.com/images/media/team/badge/r7q6ko1687608395.png',
  'colorado rockies': 'https://r2.thesportsdb.com/images/media/team/badge/r7q6ko1687608395.png',
  'tigers': 'https://r2.thesportsdb.com/images/media/team/badge/9dib6o1554032173.png',
  'detroit tigers': 'https://r2.thesportsdb.com/images/media/team/badge/9dib6o1554032173.png',
  'astros': 'https://r2.thesportsdb.com/images/media/team/badge/miwigx1521893583.png',
  'houston astros': 'https://r2.thesportsdb.com/images/media/team/badge/miwigx1521893583.png',
  'royals': 'https://r2.thesportsdb.com/images/media/team/badge/ii3rz81554031260.png',
  'kansas city royals': 'https://r2.thesportsdb.com/images/media/team/badge/ii3rz81554031260.png',
  'angels': 'https://r2.thesportsdb.com/images/media/team/badge/vswsvx1432577476.png',
  'los angeles angels': 'https://r2.thesportsdb.com/images/media/team/badge/vswsvx1432577476.png',
  'dodgers': 'https://r2.thesportsdb.com/images/media/team/badge/p2oj631663889783.png',
  'los angeles dodgers': 'https://r2.thesportsdb.com/images/media/team/badge/p2oj631663889783.png',
  'marlins': 'https://r2.thesportsdb.com/images/media/team/badge/0722fs1546001701.png',
  'miami marlins': 'https://r2.thesportsdb.com/images/media/team/badge/0722fs1546001701.png',
  'brewers': 'https://r2.thesportsdb.com/images/media/team/badge/08kh2a1595775193.png',
  'milwaukee brewers': 'https://r2.thesportsdb.com/images/media/team/badge/08kh2a1595775193.png',
  'twins': 'https://r2.thesportsdb.com/images/media/team/badge/necd5v1521905719.png',
  'minnesota twins': 'https://r2.thesportsdb.com/images/media/team/badge/necd5v1521905719.png',
  'mets': 'https://r2.thesportsdb.com/images/media/team/badge/rxqspq1431540337.png',
  'new york mets': 'https://r2.thesportsdb.com/images/media/team/badge/rxqspq1431540337.png',
  'yankees': 'https://r2.thesportsdb.com/images/media/team/badge/wqwwxx1423478766.png',
  'new york yankees': 'https://r2.thesportsdb.com/images/media/team/badge/wqwwxx1423478766.png',
  'athletics': 'https://r2.thesportsdb.com/images/media/team/badge/cyvrv31741640777.png',
  'oakland athletics': 'https://r2.thesportsdb.com/images/media/team/badge/cyvrv31741640777.png',
  'phillies': 'https://r2.thesportsdb.com/images/media/team/badge/3xrldf1617528682.png',
  'philadelphia phillies': 'https://r2.thesportsdb.com/images/media/team/badge/3xrldf1617528682.png',
  'pirates': 'https://r2.thesportsdb.com/images/media/team/badge/kw6uqr1617527138.png',
  'pittsburgh pirates': 'https://r2.thesportsdb.com/images/media/team/badge/kw6uqr1617527138.png',
  'padres': 'https://r2.thesportsdb.com/images/media/team/badge/6wt1cn1617527530.png',
  'san diego padres': 'https://r2.thesportsdb.com/images/media/team/badge/6wt1cn1617527530.png',
  'giants': 'https://r2.thesportsdb.com/images/media/team/badge/mq81yb1521896622.png',
  'san francisco giants': 'https://r2.thesportsdb.com/images/media/team/badge/mq81yb1521896622.png',
  'mariners': 'https://r2.thesportsdb.com/images/media/team/badge/39x9ph1521903933.png',
  'seattle mariners': 'https://r2.thesportsdb.com/images/media/team/badge/39x9ph1521903933.png',
  'cardinals': 'https://r2.thesportsdb.com/images/media/team/badge/uvyvyr1424003273.png',
  'st. louis cardinals': 'https://r2.thesportsdb.com/images/media/team/badge/uvyvyr1424003273.png',
  'rays': 'https://r2.thesportsdb.com/images/media/team/badge/littyt1554031623.png',
  'tampa bay rays': 'https://r2.thesportsdb.com/images/media/team/badge/littyt1554031623.png',
  'rangers': 'https://r2.thesportsdb.com/images/media/team/badge/qt9qki1521893151.png',
  'texas rangers': 'https://r2.thesportsdb.com/images/media/team/badge/qt9qki1521893151.png',
  'blue jays': 'https://r2.thesportsdb.com/images/media/team/badge/f9zk3l1617527686.png',
  'toronto blue jays': 'https://r2.thesportsdb.com/images/media/team/badge/f9zk3l1617527686.png',
  'nationals': 'https://r2.thesportsdb.com/images/media/team/badge/wpqrut1423694764.png',
  'washington nationals': 'https://r2.thesportsdb.com/images/media/team/badge/wpqrut1423694764.png',
};

const NHL_LOGOS: Record<string, string> = {
  'ducks': 'https://r2.thesportsdb.com/images/media/team/badge/1d465t1719573796.png',
  'anaheim ducks': 'https://r2.thesportsdb.com/images/media/team/badge/1d465t1719573796.png',
  'bruins': 'https://r2.thesportsdb.com/images/media/team/badge/b1r86e1720023232.png',
  'boston bruins': 'https://r2.thesportsdb.com/images/media/team/badge/b1r86e1720023232.png',
  'sabres': 'https://r2.thesportsdb.com/images/media/team/badge/3m3jhp1619536655.png',
  'buffalo sabres': 'https://r2.thesportsdb.com/images/media/team/badge/3m3jhp1619536655.png',
  'flames': 'https://r2.thesportsdb.com/images/media/team/badge/v8vkk11619536610.png',
  'calgary flames': 'https://r2.thesportsdb.com/images/media/team/badge/v8vkk11619536610.png',
  'hurricanes': 'https://r2.thesportsdb.com/images/media/team/badge/v07m3x1547232585.png',
  'carolina hurricanes': 'https://r2.thesportsdb.com/images/media/team/badge/v07m3x1547232585.png',
  'blackhawks': 'https://r2.thesportsdb.com/images/media/team/badge/tuwyvr1422041801.png',
  'chicago blackhawks': 'https://r2.thesportsdb.com/images/media/team/badge/tuwyvr1422041801.png',
  'avalanche': 'https://r2.thesportsdb.com/images/media/team/badge/wqutut1421173572.png',
  'colorado avalanche': 'https://r2.thesportsdb.com/images/media/team/badge/wqutut1421173572.png',
  'blue jackets': 'https://r2.thesportsdb.com/images/media/team/badge/ssytwt1421792535.png',
  'columbus blue jackets': 'https://r2.thesportsdb.com/images/media/team/badge/ssytwt1421792535.png',
  'stars': 'https://r2.thesportsdb.com/images/media/team/badge/qrvywq1422042125.png',
  'dallas stars': 'https://r2.thesportsdb.com/images/media/team/badge/qrvywq1422042125.png',
  'red wings': 'https://r2.thesportsdb.com/images/media/team/badge/1c24ow1546544080.png',
  'detroit red wings': 'https://r2.thesportsdb.com/images/media/team/badge/1c24ow1546544080.png',
  'oilers': 'https://r2.thesportsdb.com/images/media/team/badge/uxxsyw1421618428.png',
  'edmonton oilers': 'https://r2.thesportsdb.com/images/media/team/badge/uxxsyw1421618428.png',
  'panthers': 'https://r2.thesportsdb.com/images/media/team/badge/8qtaz11547158220.png',
  'florida panthers': 'https://r2.thesportsdb.com/images/media/team/badge/8qtaz11547158220.png',
  'kings': 'https://r2.thesportsdb.com/images/media/team/badge/w408rg1719220748.png',
  'los angeles kings': 'https://r2.thesportsdb.com/images/media/team/badge/w408rg1719220748.png',
  'wild': 'https://r2.thesportsdb.com/images/media/team/badge/swtsxs1422042685.png',
  'minnesota wild': 'https://r2.thesportsdb.com/images/media/team/badge/swtsxs1422042685.png',
  'canadiens': 'https://r2.thesportsdb.com/images/media/team/badge/stpryx1421791753.png',
  'montreal canadiens': 'https://r2.thesportsdb.com/images/media/team/badge/stpryx1421791753.png',
  'predators': 'https://r2.thesportsdb.com/images/media/team/badge/twqyvy1422052908.png',
  'nashville predators': 'https://r2.thesportsdb.com/images/media/team/badge/twqyvy1422052908.png',
  'devils': 'https://r2.thesportsdb.com/images/media/team/badge/z4rsvp1619536740.png',
  'new jersey devils': 'https://r2.thesportsdb.com/images/media/team/badge/z4rsvp1619536740.png',
  'islanders': 'https://r2.thesportsdb.com/images/media/team/badge/hqn8511619536714.png',
  'new york islanders': 'https://r2.thesportsdb.com/images/media/team/badge/hqn8511619536714.png',
  'rangers': 'https://www.thesportsdb.com/images/media/team/badge/ts2nhq1763454676.png',
  'new york rangers': 'https://www.thesportsdb.com/images/media/team/badge/ts2nhq1763454676.png',
  'senators': 'https://r2.thesportsdb.com/images/media/team/badge/2tc1qy1619536592.png',
  'ottawa senators': 'https://r2.thesportsdb.com/images/media/team/badge/2tc1qy1619536592.png',
  'flyers': 'https://r2.thesportsdb.com/images/media/team/badge/qxxppp1421794965.png',
  'philadelphia flyers': 'https://r2.thesportsdb.com/images/media/team/badge/qxxppp1421794965.png',
  'penguins': 'https://r2.thesportsdb.com/images/media/team/badge/dsj3on1546192477.png',
  'pittsburgh penguins': 'https://r2.thesportsdb.com/images/media/team/badge/dsj3on1546192477.png',
  'sharks': 'https://r2.thesportsdb.com/images/media/team/badge/yui7871546193006.png',
  'san jose sharks': 'https://r2.thesportsdb.com/images/media/team/badge/yui7871546193006.png',
  'kraken': 'https://r2.thesportsdb.com/images/media/team/badge/zsx49m1595775836.png',
  'seattle kraken': 'https://r2.thesportsdb.com/images/media/team/badge/zsx49m1595775836.png',
  'blues': 'https://r2.thesportsdb.com/images/media/team/badge/rsqtwx1422053715.png',
  'st. louis blues': 'https://r2.thesportsdb.com/images/media/team/badge/rsqtwx1422053715.png',
  'lightning': 'https://r2.thesportsdb.com/images/media/team/badge/swysut1421791822.png',
  'tampa bay lightning': 'https://r2.thesportsdb.com/images/media/team/badge/swysut1421791822.png',
  'maple leafs': 'https://r2.thesportsdb.com/images/media/team/badge/mxig4p1570129307.png',
  'toronto maple leafs': 'https://r2.thesportsdb.com/images/media/team/badge/mxig4p1570129307.png',
  'canucks': 'https://r2.thesportsdb.com/images/media/team/badge/xqxxpw1421875519.png',
  'vancouver canucks': 'https://r2.thesportsdb.com/images/media/team/badge/xqxxpw1421875519.png',
  'golden knights': 'https://r2.thesportsdb.com/images/media/team/badge/7fd4521619536689.png',
  'vegas golden knights': 'https://r2.thesportsdb.com/images/media/team/badge/7fd4521619536689.png',
  'capitals': 'https://r2.thesportsdb.com/images/media/team/badge/99ca9a1638974052.png',
  'washington capitals': 'https://r2.thesportsdb.com/images/media/team/badge/99ca9a1638974052.png',
  'jets': 'https://r2.thesportsdb.com/images/media/team/badge/bwn9hr1547233611.png',
  'winnipeg jets': 'https://r2.thesportsdb.com/images/media/team/badge/bwn9hr1547233611.png',
};

/**
 * Get sports team logo URL
 * @param team - Team name (e.g., "Chiefs", "Lakers", "Yankees")
 * @param league - Optional league hint ("NFL", "NBA", "MLB", "NHL")
 * @returns Logo URL or null if not found
 */
export function getSportsLogoUrl(team: string, league?: string): string | null {
  const normalizedTeam = team.toLowerCase().trim();
  const normalizedLeague = league?.toUpperCase();

  // If league is specified, search that league first
  if (normalizedLeague === 'NFL' && NFL_LOGOS[normalizedTeam]) {
    return NFL_LOGOS[normalizedTeam];
  }
  if (normalizedLeague === 'NBA' && NBA_LOGOS[normalizedTeam]) {
    return NBA_LOGOS[normalizedTeam];
  }
  if (normalizedLeague === 'MLB' && MLB_LOGOS[normalizedTeam]) {
    return MLB_LOGOS[normalizedTeam];
  }
  if (normalizedLeague === 'NHL' && NHL_LOGOS[normalizedTeam]) {
    return NHL_LOGOS[normalizedTeam];
  }

  // Search all leagues
  return NFL_LOGOS[normalizedTeam] ||
         NBA_LOGOS[normalizedTeam] ||
         MLB_LOGOS[normalizedTeam] ||
         NHL_LOGOS[normalizedTeam] ||
         null;
}

/**
 * Resolve logo placeholders in AI response
 * Replaces {{LOGO:LEAGUE:TEAM}} with actual URLs
 */
export function resolveLogoPlaceholders(text: string): string {
  const logoPattern = /\{\{LOGO:(\w+):([^}]+)\}\}/g;

  return text.replace(logoPattern, (match, league, team) => {
    const url = getSportsLogoUrl(team.trim(), league.trim());
    return url || match; // Return original if not found
  });
}
