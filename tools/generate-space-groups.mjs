import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const symbols = `
1 P1
2 P-1
3 P2
4 P21
5 C2
6 Pm
7 Pc
8 Cm
9 Cc
10 P2/m
11 P21/m
12 C2/m
13 P2/c
14 P21/c
15 C2/c
16 P222
17 P2221
18 P21212
19 P212121
20 C2221
21 C222
22 F222
23 I222
24 I212121
25 Pmm2
26 Pmc21
27 Pcc2
28 Pma2
29 Pca21
30 Pnc2
31 Pmn21
32 Pba2
33 Pna21
34 Pnn2
35 Cmm2
36 Cmc21
37 Ccc2
38 Amm2
39 Abm2
40 Ama2
41 Aba2
42 Fmm2
43 Fdd2
44 Imm2
45 Iba2
46 Ima2
47 Pmmm
48 Pnnn
49 Pccm
50 Pban
51 Pmma
52 Pnna
53 Pmna
54 Pcca
55 Pbam
56 Pccn
57 Pbcm
58 Pnnm
59 Pmmn
60 Pbcn
61 Pbca
62 Pnma
63 Cmcm
64 Cmca
65 Cmmm
66 Cccm
67 Cmma
68 Ccca
69 Fmmm
70 Fddd
71 Immm
72 Ibam
73 Ibca
74 Imma
75 P4
76 P41
77 P42
78 P43
79 I4
80 I41
81 P-4
82 I-4
83 P4/m
84 P42/m
85 P4/n
86 P42/n
87 I4/m
88 I41/a
89 P422
90 P4212
91 P4122
92 P41212
93 P4222
94 P42212
95 P4322
96 P43212
97 I422
98 I4122
99 P4mm
100 P4bm
101 P42cm
102 P42nm
103 P4cc
104 P4nc
105 P42mc
106 P42bc
107 I4mm
108 I4cm
109 I41md
110 I41cd
111 P-42m
112 P-42c
113 P-421m
114 P-421c
115 P-4m2
116 P-4c2
117 P-4b2
118 P-4n2
119 I-4m2
120 I-4c2
121 I-42m
122 I-42d
123 P4/mmm
124 P4/mcc
125 P4/nbm
126 P4/nnc
127 P4/mbm
128 P4/mnc
129 P4/nmm
130 P4/ncc
131 P42/mmc
132 P42/mcm
133 P42/nbc
134 P42/nnm
135 P42/mbc
136 P42/mnm
137 P42/nmc
138 P42/ncm
139 I4/mmm
140 I4/mcm
141 I41/amd
142 I41/acd
143 P3
144 P31
145 P32
146 R3
147 P-3
148 R-3
149 P312
150 P321
151 P3112
152 P3121
153 P3212
154 P3221
155 R32
156 P3m1
157 P31m
158 P3c1
159 P31c
160 R3m
161 R3c
162 P-31m
163 P-31c
164 P-3m1
165 P-3c1
166 R-3m
167 R-3c
168 P6
169 P61
170 P65
171 P62
172 P64
173 P63
174 P-6
175 P6/m
176 P63/m
177 P622
178 P6122
179 P6522
180 P6222
181 P6422
182 P6322
183 P6mm
184 P6cc
185 P63cm
186 P63mc
187 P-6m2
188 P-6c2
189 P-62m
190 P-62c
191 P6/mmm
192 P6/mcc
193 P63/mcm
194 P63/mmc
195 P23
196 F23
197 I23
198 P213
199 I213
200 Pm-3
201 Pn-3
202 Fm-3
203 Fd-3
204 Im-3
205 Pa-3
206 Ia-3
207 P432
208 P4232
209 F432
210 F4132
211 I432
212 P4332
213 P4132
214 I4132
215 P-43m
216 F-43m
217 I-43m
218 P-43n
219 F-43c
220 I-43d
221 Pm-3m
222 Pn-3n
223 Pm-3n
224 Pn-3m
225 Fm-3m
226 Fm-3c
227 Fd-3m
228 Fd-3c
229 Im-3m
230 Ia-3d
`.trim().split(/\n+/).map(line=>{const m=line.match(/^(\d+)\s+(\S+)$/);return {number:+m[1],hm:m[2]};});

if(symbols.length!==230 || symbols.some((g,i)=>g.number!==i+1)) throw new Error('Space-group table must contain 1..230 exactly');

const pgMeta={
 '1':{s:'C1',order:1,laue:'-1',polar:true,centro:false,properOnly:true},
 '-1':{s:'Ci',order:2,laue:'-1',polar:false,centro:true,properOnly:false},
 '2':{s:'C2',order:2,laue:'2/m',polar:true,centro:false,properOnly:true},
 'm':{s:'Cs',order:2,laue:'2/m',polar:true,centro:false,properOnly:false},
 '2/m':{s:'C2h',order:4,laue:'2/m',polar:false,centro:true,properOnly:false},
 '222':{s:'D2',order:4,laue:'mmm',polar:false,centro:false,properOnly:true},
 'mm2':{s:'C2v',order:4,laue:'mmm',polar:true,centro:false,properOnly:false},
 'mmm':{s:'D2h',order:8,laue:'mmm',polar:false,centro:true,properOnly:false},
 '4':{s:'C4',order:4,laue:'4/m',polar:true,centro:false,properOnly:true},
 '-4':{s:'S4',order:4,laue:'4/m',polar:false,centro:false,properOnly:false},
 '4/m':{s:'C4h',order:8,laue:'4/m',polar:false,centro:true,properOnly:false},
 '422':{s:'D4',order:8,laue:'4/mmm',polar:false,centro:false,properOnly:true},
 '4mm':{s:'C4v',order:8,laue:'4/mmm',polar:true,centro:false,properOnly:false},
 '-42m':{s:'D2d',order:8,laue:'4/mmm',polar:false,centro:false,properOnly:false},
 '4/mmm':{s:'D4h',order:16,laue:'4/mmm',polar:false,centro:true,properOnly:false},
 '3':{s:'C3',order:3,laue:'-3',polar:true,centro:false,properOnly:true},
 '-3':{s:'C3i',order:6,laue:'-3',polar:false,centro:true,properOnly:false},
 '32':{s:'D3',order:6,laue:'-3m',polar:false,centro:false,properOnly:true},
 '3m':{s:'C3v',order:6,laue:'-3m',polar:true,centro:false,properOnly:false},
 '-3m':{s:'D3d',order:12,laue:'-3m',polar:false,centro:true,properOnly:false},
 '6':{s:'C6',order:6,laue:'6/m',polar:true,centro:false,properOnly:true},
 '-6':{s:'C3h',order:6,laue:'6/m',polar:false,centro:false,properOnly:false},
 '6/m':{s:'C6h',order:12,laue:'6/m',polar:false,centro:true,properOnly:false},
 '622':{s:'D6',order:12,laue:'6/mmm',polar:false,centro:false,properOnly:true},
 '6mm':{s:'C6v',order:12,laue:'6/mmm',polar:true,centro:false,properOnly:false},
 '-6m2':{s:'D3h',order:12,laue:'6/mmm',polar:false,centro:false,properOnly:false},
 '6/mmm':{s:'D6h',order:24,laue:'6/mmm',polar:false,centro:true,properOnly:false},
 '23':{s:'T',order:12,laue:'m-3',polar:false,centro:false,properOnly:true},
 'm-3':{s:'Th',order:24,laue:'m-3',polar:false,centro:true,properOnly:false},
 '432':{s:'O',order:24,laue:'m-3m',polar:false,centro:false,properOnly:true},
 '-43m':{s:'Td',order:24,laue:'m-3m',polar:false,centro:false,properOnly:false},
 'm-3m':{s:'Oh',order:48,laue:'m-3m',polar:false,centro:true,properOnly:false}
};
const ranges=[
 [1,1,'1'],[2,2,'-1'],[3,5,'2'],[6,9,'m'],[10,15,'2/m'],[16,24,'222'],[25,46,'mm2'],[47,74,'mmm'],
 [75,80,'4'],[81,82,'-4'],[83,88,'4/m'],[89,98,'422'],[99,110,'4mm'],[111,122,'-42m'],[123,142,'4/mmm'],
 [143,146,'3'],[147,148,'-3'],[149,155,'32'],[156,161,'3m'],[162,167,'-3m'],
 [168,173,'6'],[174,174,'-6'],[175,176,'6/m'],[177,182,'622'],[183,186,'6mm'],[187,190,'-6m2'],[191,194,'6/mmm'],
 [195,199,'23'],[200,206,'m-3'],[207,214,'432'],[215,220,'-43m'],[221,230,'m-3m']
];
const systemOf=n=>n<=2?'triclinic':n<=15?'monoclinic':n<=74?'orthorhombic':n<=142?'tetragonal':n<=167?'trigonal':n<=194?'hexagonal':'cubic';
const systemZh={triclinic:'三斜',monoclinic:'单斜',orthorhombic:'正交',tetragonal:'四方',trigonal:'三方',hexagonal:'六方',cubic:'立方'};
const pgOf=n=>ranges.find(([a,b])=>n>=a&&n<=b)[2];
const bravaisOf=(system,c)=>{
 if(system==='triclinic')return 'aP';
 if(system==='monoclinic')return c==='P'?'mP':'mC';
 if(system==='orthorhombic')return c==='P'?'oP':c==='I'?'oI':c==='F'?'oF':'oC';
 if(system==='tetragonal')return c==='I'?'tI':'tP';
 if(system==='trigonal')return c==='R'?'hR':'hP';
 if(system==='hexagonal')return 'hP';
 return c==='I'?'cI':c==='F'?'cF':'cP';
};
const symmorphicNumbers=new Set([
  1,2,3,5,6,8,10,12,
  16,21,22,23,25,35,38,42,44,47,65,69,71,
  75,79,81,82,83,87,89,97,99,107,111,115,119,121,123,139,
  143,146,147,148,149,150,155,156,157,160,162,164,166,
  168,174,175,177,183,187,189,191,
  195,196,197,200,202,204,207,209,211,215,216,217,221,225,229
]);
const glideRe=/[abcnde]/;
const groups=symbols.map(g=>{
 const system=systemOf(g.number),pointGroup=pgOf(g.number),pg=pgMeta[pointGroup],centering=g.hm[0],body=g.hm.slice(1);
 const symmorphic=symmorphicNumbers.has(g.number),hasGlide=glideRe.test(body.replace(/m/g,''));
 return {...g,system,systemZh:systemZh[system],pointGroup,schoenflies:pg.s,laue:pg.laue,pointGroupOrder:pg.order,centering,bravais:bravaisOf(system,centering),polar:pg.polar,centrosymmetric:pg.centro,sohncke:pg.properOnly,hasGlide,symmorphic,nonsymmorphic:!symmorphic};
});

const header=`// Generated by tools/generate-space-groups.mjs\n// Factual space-group symbols follow standard International/Hermann–Mauguin notation.\n// Classification is derived from International-number ranges and point-group metadata.\n`;
writeFileSync(resolve('src/data/space-groups.js'),header+`export const POINT_GROUP_METADATA=${JSON.stringify(pgMeta,null,2)};\nexport const SPACE_GROUPS=${JSON.stringify(groups,null,2)};\n`);

const rows=groups.map(g=>`| ${g.number} | ${g.hm} | ${g.systemZh} | ${g.bravais} | ${g.pointGroup} | ${g.schoenflies} | ${g.laue} | ${g.symmorphic?'是':'否'} | ${g.sohncke?'是':'否'} |`).join('\n');
writeFileSync(resolve('docs/reference/space-groups-230.md'),`# 230 个三维晶体空间群\n\n统一字段：国际编号、Hermann–Mauguin 短符号、晶系、Bravais 类型、点群、Schoenflies、Laue 类、是否 symmorphic、是否 Sohncke。\n\n| No. | H–M | 晶系 | Bravais | 点群 | Schoenflies | Laue | Symmorphic | Sohncke |\n|---:|---|---|---|---|---|---|---|---|\n${rows}\n`);
console.log(`generated ${groups.length} space groups`);
