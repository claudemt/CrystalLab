export const KPATHS={
  'cubic-P':{
    variant:'cP2',
    points:{GAMMA:[0,0,0],R:[.5,.5,.5],M:[.5,.5,0],X:[0,.5,0],X_1:[.5,0,0]},
    path:[['GAMMA','X'],['X','M'],['M','GAMMA'],['GAMMA','R'],['R','X'],['R','M']]
  },
  'cubic-F':{
    variant:'cF2',
    points:{GAMMA:[0,0,0],X:[.5,0,.5],L:[.5,.5,.5],W:[.5,.25,.75],W_2:[.75,.25,.5],K:[.375,.375,.75],U:[.625,.25,.625]},
    path:[['GAMMA','X'],['X','U'],['K','GAMMA'],['GAMMA','L'],['L','W'],['W','X']]
  },
  'cubic-I':{
    variant:'cI1',
    points:{GAMMA:[0,0,0],H:[.5,-.5,.5],P:[.25,.25,.25],N:[0,0,.5]},
    path:[['GAMMA','H'],['H','N'],['N','GAMMA'],['GAMMA','P'],['P','H'],['P','N']]
  },
  'tetragonal-P':{
    variant:'tP1',
    points:{GAMMA:[0,0,0],Z:[0,0,.5],M:[.5,.5,0],A:[.5,.5,.5],R:[0,.5,.5],X:[0,.5,0]},
    path:[['GAMMA','X'],['X','M'],['M','GAMMA'],['GAMMA','Z'],['Z','R'],['R','A'],['A','Z'],['X','R'],['M','A']]
  },
  'orthorhombic-P':{
    variant:'oP1',
    points:{GAMMA:[0,0,0],X:[.5,0,0],Z:[0,0,.5],U:[.5,0,.5],Y:[0,.5,0],S:[.5,.5,0],T:[0,.5,.5],R:[.5,.5,.5]},
    path:[['GAMMA','X'],['X','S'],['S','Y'],['Y','GAMMA'],['GAMMA','Z'],['Z','U'],['U','R'],['R','T'],['T','Z'],['X','U'],['Y','T'],['S','R']]
  },
  'hexagonal-P':{
    variant:'hP2',
    points:{GAMMA:[0,0,0],A:[0,0,.5],K:[1/3,1/3,0],H:[1/3,1/3,.5],H_2:[1/3,1/3,-.5],M:[.5,0,0],L:[.5,0,.5]},
    path:[['GAMMA','M'],['M','K'],['K','GAMMA'],['GAMMA','A'],['A','L'],['L','H'],['H','A'],['L','M'],['H','K']]
  }
};

export function getKPath(latticeId){return KPATHS[latticeId]||null}
export function displayKLabel(label){return label==='GAMMA'?'Γ':label.replace('_1','₁').replace('_2','₂')}
