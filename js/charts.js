/**
 * Rekap jenis kelamin, agama, dan seluruh chart ApexCharts.
 */
// =========================
// REKAP JENIS KELAMIN
// =========================
function bindRecapControls(){

  document.querySelectorAll('[data-religion-tab]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      state.religionMode=btn.dataset.religionTab;
      document.querySelectorAll('[data-religion-tab]').forEach(x=>x.classList.toggle('active',x===btn));
      renderReligionRecap();
    });
  });
}

function groupGender(mode){
  const d=state.dashboard||{};
  const rows=mode==='rombel' ? d.genderByRombel : d.genderByClass;
  return Array.isArray(rows)?rows:[];
}

function scheduleGenderRender(){
  const view=document.getElementById('view-gender');
  if(!view || !view.classList.contains('active')) return;

  // Dua frame memberi browser waktu menghitung lebar card setelah view display:block.
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      if(view.classList.contains('active')) renderGenderRecap();
    });
  });
}

function renderGenderRecap(){
  const classData=groupGender('kelas');
  const rombelData=groupGender('rombel');

  renderGenderTable(classData,'kelas','genderClassBody','genderClassFoot');
  renderGenderTable(rombelData,'rombel','genderRombelBody','genderRombelFoot');

  renderGenderChartBlock('genderClassChart',classData,'kelas','genderClass',205);
  renderGenderChartBlock(
    'genderRombelChart',
    rombelData,
    'rombel',
    'genderRombel',
    Math.max(270,rombelData.length*25)
  );
}

function renderGenderTable(data,mode,bodyId,footId){
  const body=document.getElementById(bodyId);
  const foot=document.getElementById(footId);
  if(!body||!foot) return;

  if(!data.length){
    body.innerHTML='<tr><td colspan="5" class="empty-state">Belum ada data peserta didik.</td></tr>';
    foot.innerHTML='';
    return;
  }

  body.innerHTML=data.map((x,i)=>`
    <tr>
      <td>${i+1}</td>
      <td>${esc(displayGroupName(mode,x.nama))}</td>
      <td class="text-center">${formatNumber(x.l)}</td>
      <td class="text-center">${formatNumber(x.p)}</td>
      <td class="text-center fw-bold">${formatNumber(x.total)}</td>
    </tr>
  `).join('');

  const total=data.reduce(
    (a,x)=>({l:a.l+x.l,p:a.p+x.p,total:a.total+x.total}),
    {l:0,p:0,total:0}
  );

  foot.innerHTML=`
    <tr>
      <td colspan="2">Jumlah</td>
      <td class="text-center">${formatNumber(total.l)}</td>
      <td class="text-center">${formatNumber(total.p)}</td>
      <td class="text-center">${formatNumber(total.total)}</td>
    </tr>
  `;
}

// Grafik Jenis Kelamin: gunakan formatter total yang kompatibel dengan ApexCharts.
function renderGenderChartBlock(targetId,data,mode,chartKey,height){
  if(state.charts[chartKey]){
    try{ state.charts[chartKey].destroy(); }catch(e){}
    state.charts[chartKey]=null;
  }

  const target=document.getElementById(targetId);
  if(!target) return;

  target.innerHTML='';
  target.style.width='100%';
  target.style.height=`${Math.max(180,height)}px`;

  if(!Array.isArray(data) || !data.length){
    target.innerHTML='<div class="d-flex align-items-center justify-content-center h-100 small-note">Belum ada data untuk ditampilkan.</div>';
    return;
  }

  if(typeof ApexCharts==='undefined'){
    target.innerHTML='<div class="d-flex align-items-center justify-content-center h-100 text-danger small">Grafik belum dapat dimuat.</div>';
    return;
  }

  const categories=data.map(x=>displayGroupName(mode,x.nama));
  const maxTotal=Math.max(1,...data.map(x=>Number(x.total)||0));
  const axisStep=maxTotal<=50?10:maxTotal<=150?25:50;
  const axisMax=Math.max(axisStep,Math.ceil((maxTotal*1.12)/axisStep)*axisStep);

  const options={
    series:[
      {name:'Laki-laki',data:data.map(x=>Number(x.l)||0)},
      {name:'Perempuan',data:data.map(x=>Number(x.p)||0)}
    ],
    chart:{
      type:'bar',
      height:Math.max(180,height),
      width:'100%',
      stacked:true,
      toolbar:{show:false},
      animations:{enabled:true,speed:240},
      fontFamily:'inherit',
      parentHeightOffset:0,
      redrawOnParentResize:true,
      redrawOnWindowResize:true
    },
    plotOptions:{
      bar:{
        horizontal:true,
        barHeight:mode==='kelas'?'36%':'50%',
        borderRadius:2,
        borderRadiusApplication:'end',
        dataLabels:{
          position:'center',
          total:{
            enabled:true,
            offsetX:7,
            style:{fontSize:'9px',fontWeight:700,color:'#64748b'},
            formatter:(val)=>formatNumber(Number(val)||0)
          }
        }
      }
    },
    dataLabels:{
      enabled:true,
      formatter:value=>Number(value)>0?formatNumber(value):'',
      style:{fontSize:'9px',fontWeight:700,colors:['#fff']},
      dropShadow:{enabled:false}
    },
    stroke:{show:false,width:0},
    xaxis:{
      categories,
      min:0,
      max:axisMax,
      tickAmount:4,
      labels:{
        style:{fontSize:'9px',colors:'#94a3b8'},
        formatter:value=>formatNumber(Math.round(Number(value)||0))
      },
      axisBorder:{show:false},
      axisTicks:{show:false}
    },
    yaxis:{
      labels:{
        show:true,
        trim:false,
        minWidth:mode==='kelas'?48:82,
        maxWidth:mode==='kelas'?68:120,
        style:{fontSize:'9px',fontWeight:600,colors:['#475569']}
      }
    },
    grid:{
      borderColor:'#eef2f7',
      strokeDashArray:3,
      padding:{top:-8,right:24,bottom:-6,left:2},
      xaxis:{lines:{show:true}},
      yaxis:{lines:{show:false}}
    },
    legend:{
      position:'top',
      horizontalAlign:'right',
      fontSize:'10px',
      fontWeight:600,
      itemMargin:{horizontal:8,vertical:0},
      markers:{width:8,height:8,radius:2}
    },
    tooltip:{
      shared:true,
      intersect:false,
      y:{formatter:value=>`${formatNumber(value)} siswa`}
    },
    responsive:[{
      breakpoint:768,
      options:{
        legend:{horizontalAlign:'left',fontSize:'9px'},
        yaxis:{labels:{minWidth:mode==='kelas'?42:70,maxWidth:mode==='kelas'?58:92,style:{fontSize:'8px'}}},
        dataLabels:{style:{fontSize:'8px',fontWeight:700,colors:['#fff']}},
        grid:{padding:{top:-8,right:18,bottom:-6,left:0}}
      }
    }]
  };

  try{
    const chart=new ApexCharts(target,options);
    state.charts[chartKey]=chart;
    const rendered=chart.render();
    if(rendered && typeof rendered.catch==='function'){
      rendered.catch(err=>{
        console.error('Gagal merender grafik:',err);
        if(!target.querySelector('.apexcharts-canvas')){
          target.innerHTML='<div class="d-flex align-items-center justify-content-center h-100 text-danger small">Grafik belum dapat ditampilkan.</div>';
        }
      });
    }
  }catch(err){
    console.error('Gagal membuat grafik:',err);
    target.innerHTML='<div class="d-flex align-items-center justify-content-center h-100 text-danger small">Grafik belum dapat ditampilkan.</div>';
  }
}

function scheduleDashboardRender(){
  const view=document.getElementById('view-dashboard');
  if(!view || !view.classList.contains('active')) return;
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      if(view.classList.contains('active')) renderDashboardCharts();
    });
  });
}

function destroyChartSafe(key){
  if(state.charts[key]){
    try{ state.charts[key].destroy(); }catch(e){}
    state.charts[key]=null;
  }
}

function chartFallback(target,message='Belum ada data untuk ditampilkan.'){
  if(!target) return;
  target.innerHTML=`<div class="d-flex h-100 align-items-center justify-content-center small-note text-center px-3">${esc(message)}</div>`;
}

function renderDashboardCharts(){
  const genderTarget=document.getElementById('dashboardGenderChart');
  const religionTarget=document.getElementById('dashboardReligionChart');
  if(!genderTarget || !religionTarget) return;

  if(typeof ApexCharts==='undefined'){
    chartFallback(genderTarget,'Grafik belum dapat dimuat.');
    chartFallback(religionTarget,'Grafik belum dapat dimuat.');
    return;
  }

  // ---------- Komposisi Jenis Kelamin per Kelas ----------
  destroyChartSafe('dashboardGender');
  const gender=groupGender('kelas');

  if(!gender.length){
    chartFallback(genderTarget);
  }else{
    genderTarget.innerHTML='';
    genderTarget.style.height='260px';

    const maxTotal=Math.max(1,...gender.map(x=>Number(x.total)||0));
    const step=maxTotal<=50?10:maxTotal<=150?25:50;
    const axisMax=Math.max(step,Math.ceil((maxTotal*1.10)/step)*step);

    const genderOptions={
      series:[
        {name:'Laki-laki',data:gender.map(x=>Number(x.l)||0)},
        {name:'Perempuan',data:gender.map(x=>Number(x.p)||0)}
      ],
      chart:{
        type:'bar',
        height:260,
        width:'100%',
        stacked:true,
        toolbar:{show:false},
        animations:{enabled:true,speed:220},
        parentHeightOffset:0,
        fontFamily:'inherit',
        redrawOnParentResize:true,
        redrawOnWindowResize:true
      },
      plotOptions:{
        bar:{
          horizontal:true,
          barHeight:'34%',
          borderRadius:2,
          borderRadiusApplication:'end'
        }
      },
      dataLabels:{
        enabled:true,
        formatter:value=>Number(value)>0?formatNumber(value):'',
        style:{fontSize:'9px',fontWeight:700,colors:['#fff']},
        dropShadow:{enabled:false}
      },
      xaxis:{
        categories:gender.map(x=>displayGroupName('kelas',x.nama)),
        min:0,
        max:axisMax,
        tickAmount:4,
        labels:{
          style:{fontSize:'9px',colors:'#94a3b8'},
          formatter:value=>formatNumber(Math.round(Number(value)||0))
        },
        axisBorder:{show:false},
        axisTicks:{show:false}
      },
      yaxis:{
        labels:{
          trim:false,
          minWidth:48,
          maxWidth:70,
          style:{fontSize:'9px',fontWeight:600,colors:['#475569']}
        }
      },
      grid:{
        borderColor:'#eef2f7',
        strokeDashArray:3,
        padding:{top:-8,right:12,bottom:-7,left:2},
        xaxis:{lines:{show:true}},
        yaxis:{lines:{show:false}}
      },
      legend:{
        position:'top',
        horizontalAlign:'right',
        fontSize:'10px',
        fontWeight:600,
        itemMargin:{horizontal:8,vertical:0},
        markers:{width:8,height:8,radius:2}
      },
      tooltip:{
        shared:true,
        intersect:false,
        y:{formatter:value=>`${formatNumber(value)} siswa`}
      },
      responsive:[{
        breakpoint:768,
        options:{
          chart:{height:235},
          legend:{horizontalAlign:'left',fontSize:'9px'},
          yaxis:{labels:{minWidth:42,maxWidth:58,style:{fontSize:'8px'}}},
          dataLabels:{style:{fontSize:'8px',fontWeight:700,colors:['#fff']}},
          grid:{padding:{top:-8,right:8,bottom:-7,left:0}}
        }
      }]
    };

    try{
      const chart=new ApexCharts(genderTarget,genderOptions);
      state.charts.dashboardGender=chart;
      const rendered=chart.render();
      if(rendered && typeof rendered.catch==='function'){
        rendered.catch(err=>{
          console.error('Gagal merender komposisi jenis kelamin:',err);
          if(!genderTarget.querySelector('.apexcharts-canvas')){
            chartFallback(genderTarget,'Grafik jenis kelamin belum dapat ditampilkan.');
          }
        });
      }
    }catch(err){
      console.error('Gagal membuat komposisi jenis kelamin:',err);
      chartFallback(genderTarget,'Grafik jenis kelamin belum dapat ditampilkan.');
    }
  }

  // ---------- Komposisi Agama ----------
  destroyChartSafe('dashboardReligion');
  const religions=Array.isArray(state.dashboard?.religionTotals)
    ? state.dashboard.religionTotals.filter(x=>Number(x.value)>0)
    : [];

  if(!religions.length){
    chartFallback(religionTarget);
  }else{
    religionTarget.innerHTML='';
    religionTarget.style.height='260px';
    const totalReligion=religions.reduce((a,x)=>a+x.value,0);

    const religionOptions={
      series:religions.map(x=>x.value),
      labels:religions.map(x=>x.name),
      chart:{
        type:'donut',
        height:260,
        width:'100%',
        toolbar:{show:false},
        animations:{enabled:true,speed:220},
        parentHeightOffset:0,
        fontFamily:'inherit',
        redrawOnParentResize:true,
        redrawOnWindowResize:true
      },
      plotOptions:{
        pie:{
          expandOnClick:false,
          donut:{
            size:'66%',
            labels:{
              show:true,
              name:{show:true,fontSize:'11px',offsetY:16},
              value:{
                show:true,
                fontSize:'18px',
                fontWeight:800,
                offsetY:-8,
                formatter:value=>formatNumber(Number(value)||0)
              },
              total:{
                show:true,
                showAlways:true,
                label:'Jumlah',
                fontSize:'10px',
                fontWeight:600,
                formatter:()=>formatNumber(totalReligion)
              }
            }
          }
        }
      },
      dataLabels:{
        enabled:true,
        formatter:(percent,opts)=>{
          const value=opts.w.config.series[opts.seriesIndex]||0;
          return value>0?formatNumber(value):'';
        },
        style:{fontSize:'9px',fontWeight:700},
        dropShadow:{enabled:false}
      },
      legend:{
        position:'bottom',
        horizontalAlign:'center',
        fontSize:'9px',
        fontWeight:600,
        itemMargin:{horizontal:7,vertical:3},
        markers:{width:7,height:7,radius:2}
      },
      stroke:{width:2},
      tooltip:{
        y:{formatter:value=>`${formatNumber(value)} siswa`}
      },
      responsive:[{
        breakpoint:768,
        options:{
          chart:{height:235},
          plotOptions:{pie:{donut:{size:'64%'}}},
          dataLabels:{style:{fontSize:'8px'}},
          legend:{fontSize:'8px',itemMargin:{horizontal:5,vertical:2}}
        }
      }]
    };

    try{
      const chart=new ApexCharts(religionTarget,religionOptions);
      state.charts.dashboardReligion=chart;
      const rendered=chart.render();
      if(rendered && typeof rendered.catch==='function'){
        rendered.catch(err=>{
          console.error('Gagal merender komposisi agama:',err);
          if(!religionTarget.querySelector('.apexcharts-canvas')){
            chartFallback(religionTarget,'Grafik agama belum dapat ditampilkan.');
          }
        });
      }
    }catch(err){
      console.error('Gagal membuat komposisi agama:',err);
      chartFallback(religionTarget,'Grafik agama belum dapat ditampilkan.');
    }
  }
}

// =========================
// REKAP AGAMA
// =========================
function groupReligion(mode){
  const d=state.dashboard||{};
  const rows=mode==='rombel' ? d.religionByRombel : d.religionByClass;
  return Array.isArray(rows)?rows:[];
}

function renderReligionRecap(){
  const mode=state.religionMode;
  const label=mode==='kelas'?'Kelas':'Rombel';
  const data=groupReligion(mode);

  document.getElementById('religionTableTitle').textContent=`Rekap Agama per ${label}`;
  document.getElementById('religionHead').innerHTML=`
    <tr><th>No</th><th>${label}</th>${APP.agama.map(a=>`<th>${esc(a)}</th>`).join('')}<th>Jumlah</th></tr>`;

  const body=document.getElementById('religionBody');
  if(!data.length){
    body.innerHTML=`<tr><td colspan="${APP.agama.length+3}" class="empty-state">Belum ada data.</td></tr>`;
    document.getElementById('religionFoot').innerHTML='';
    return;
  }

  body.innerHTML=data.map((x,i)=>`
    <tr><td>${i+1}</td><td>${esc(displayGroupName(mode,x.nama))}</td>
    ${APP.agama.map(a=>`<td>${x[a]}</td>`).join('')}
    <td class="fw-bold">${x.total}</td></tr>
  `).join('');

  const totals={total:0};
  APP.agama.forEach(a=>totals[a]=0);
  data.forEach(x=>{
    APP.agama.forEach(a=>totals[a]+=x[a]);
    totals.total+=x.total;
  });

  document.getElementById('religionFoot').innerHTML=`
    <tr class="fw-bold"><td colspan="2">Jumlah</td>
    ${APP.agama.map(a=>`<td>${totals[a]}</td>`).join('')}
    <td>${totals.total}</td></tr>`;
}
