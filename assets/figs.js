/* PMIC Notes — good-vs-bad PCB layout figures (top view), drawn into <figure class="cmp" data-fig="…">.
   One source for both languages; colours follow the theme. */
(function(){
  const t = (window.MemSite && window.MemSite.t) || (zh => zh);

  /* ---------- PCB drawing primitives ---------- */
  const board = (w, h) => '<rect class="pcb" x="0" y="0" width="' + w + '" height="' + h + '" rx="8"/>';
  const trace = (pts, w) => '<polyline class="cu" points="' + pts.map(p => p.join(',')).join(' ') + '" style="stroke-width:' + (w || 4) + 'px"/>';
  const inner = (pts, w) => '<polyline class="cu inner" points="' + pts.map(p => p.join(',')).join(' ') + '" style="stroke-width:' + (w || 3) + 'px"/>';
  const pour = (pts) => '<polygon class="cu-fill" points="' + pts.map(p => p.join(',')).join(' ') + '"/>';
  const pad = (x, y, w, h) => '<rect class="pad" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="1.5"/>';
  const via = (x, y) => '<circle class="via" cx="' + x + '" cy="' + y + '" r="3.2"/>';
  // top = true puts the part name near the top edge, clear of the pin labels
  const body = (x, y, w, h, label, sub, top) => '<rect class="chip" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3"/>' +
    '<text class="ts lbl" x="' + (x + w / 2) + '" y="' + (top ? y + 16 : y + h / 2 + (sub ? -2 : 4)) + '" text-anchor="middle">' + label + '</text>' +
    (sub ? '<text class="ts lbl t-mut" x="' + (x + w / 2) + '" y="' + (y + h / 2 + 12) + '" text-anchor="middle">' + sub + '</text>' : '');
  const pin = (x, y, w, h, label, ax, ay, anchor) => pad(x, y, w, h) + '<text class="ts pinl" x="' + ax + '" y="' + ay + '" text-anchor="' + (anchor || 'middle') + '">' + label + '</text>';
  // vertical 2-pad part (capacitor / resistor) centred on x, pads centred at y1 and y2
  const partV = (x, y1, y2, label, side) => pad(x - 6, y1 - 4, 12, 8) + pad(x - 6, y2 - 4, 12, 8) +
    '<rect class="part-body" x="' + (x - 4) + '" y="' + (y1 + 4) + '" width="8" height="' + Math.max(y2 - y1 - 8, 2) + '"/>' +
    (label ? '<text class="ts lbl" x="' + (x + (side === 'left' ? -10 : 10)) + '" y="' + ((y1 + y2) / 2 + 4) + '" text-anchor="' + (side === 'left' ? 'end' : 'start') + '">' + label + '</text>' : '');
  const loop = (pts, good) => '<polygon class="' + (good ? 'loop-ok' : 'loop-bad') + '" points="' + pts.map(p => p.join(',')).join(' ') + '"/>';
  const zone = (cx, cy, rx, ry) => '<ellipse class="zone" cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '"/>';
  const note = (x, y, s, cls, anchor) => '<text class="ts ' + (cls || 'nb') + '" x="' + x + '" y="' + y + '" text-anchor="' + (anchor || 'middle') + '">' + s + '</text>';
  const sub = (a, b) => a + '<tspan baseline-shift="sub" font-size="7.5">' + b + '</tspan>';

  /* ---------- the four comparisons ---------- */
  const FIGS = {
    hotloop: () => {
      const ic = body(150, 70, 70, 80, 'Buck IC', '', true) + pin(144, 95, 10, 10, 'VIN', 160, 103, 'start') + pin(144, 120, 10, 10, 'PGND', 160, 128, 'start') +
        pin(216, 105, 10, 10, 'SW', 211, 113, 'end') + trace([[226, 110], [250, 110]], 9) + body(250, 98, 46, 24, 'L');
      return {
        title:t('Buck 熱迴路：輸入電容的位置', 'Buck hot loop: where the input capacitor goes'),
        bad: board(320, 210) + loop([[40, 45], [110, 45], [110, 100], [150, 100], [150, 125], [120, 125], [120, 190], [40, 190]]) +
          trace([[40, 45], [110, 45], [110, 100], [145, 100]]) + trace([[40, 65], [40, 190], [120, 190], [120, 125], [145, 125]]) +
          partV(40, 45, 65, sub('C', 'IN'), 'left') + ic + note(76, 150, t('迴路面積大', 'large loop area'), 'nb') + note(76, 164, '≈ 10 nH', 'nb'),
        good: board(320, 210) + loop([[119, 100], [150, 100], [150, 125], [119, 125]], true) +
          trace([[10, 100], [145, 100]], 6) + trace([[125, 125], [145, 125]], 6) + pour([[100, 132], [150, 132], [150, 175], [100, 175]]) +
          via(112, 150) + via(126, 150) + via(140, 150) + via(112, 164) + via(126, 164) + via(140, 164) +
          partV(125, 100, 125, sub('C', 'IN'), 'left') + note(20, 92, sub('V', 'IN'), 'pinl', 'start') + ic +
          note(222, 185, t('迴路極小 ≈ 1 nH', 'tiny loop ≈ 1 nH'), 'nok') + note(222, 199, t('地直接打孔到地平面', 'ground vias straight to the plane'), 'nok'),
        badNotes:[t('C<sub>IN</sub> 放在遠處，脈衝電流繞一大圈', 'C<sub>IN</sub> placed far away; the pulsed current loops a long way'),
                  t('寄生電感大 → SW 振鈴與尖峰（V = L·di/dt，5 nH × 1 A/ns ≈ 5 V）', 'large parasitic inductance → SW ringing and spikes (V = L·di/dt, 5 nH × 1 A/ns ≈ 5 V)'),
                  t('尖峰可能超過絕對最大額定 → EOS；輻射 EMI 也變大', 'spikes can exceed absolute maximum → EOS; radiated EMI rises too')],
        goodNotes:[t('C<sub>IN</sub>（小容值高頻電容）緊貼 VIN 與 PGND 腳', 'C<sub>IN</sub> (small high-frequency cap) right against the VIN and PGND pins'),
                   t('電流迴路面積最小，寄生電感降到約 1/10', 'loop area is minimal; parasitic inductance drops about tenfold'),
                   t('地端直接用多個過孔接到完整的地平面', 'the ground end goes straight to a solid ground plane through several vias')]
      };
    },
    swfb: () => {
      const ic = body(40, 70, 70, 80, 'Buck IC', '', true) + pin(106, 99, 10, 12, 'SW', 101, 108, 'end') + pin(106, 130, 10, 8, 'FB', 101, 137, 'end');
      const out = body(170, 93, 50, 24, 'L') + trace([[220, 105], [262, 105]], 8) + partV(270, 105, 135, sub('C', 'OUT')) + trace([[276, 105], [312, 105]], 8) +
        note(312, 96, sub('V', 'OUT'), 'pinl', 'end');
      return {
        title:t('SW 節點與 FB 回授走線', 'SW node and FB feedback trace'),
        bad: board(320, 210) + pour([[116, 78], [175, 78], [175, 128], [116, 128]]) + note(146, 74, t('SW 大面積銅', 'big SW copper'), 'nb') + out +
          partV(240, 140, 160) + inner([[240, 150], [195, 150], [195, 108], [150, 108], [150, 134], [116, 134]]) + ic +
          zone(172, 128, 34, 26) + note(200, 190, t('FB 從電感與 SW 下方穿過 → 拾取雜訊', 'FB runs under the inductor and SW → picks up noise'), 'nb'),
        good: board(320, 210) + trace([[116, 105], [170, 105]], 12) + out + ic +
          partV(130, 150, 170) + trace([[116, 134], [130, 134], [130, 146]], 2.5) + trace([[270, 109], [290, 109], [290, 190], [146, 190], [146, 160], [136, 160]], 2.5) +
          note(200, 182, t('從 C_OUT 取樣，繞開 SW 與電感', 'sensed at C_OUT, routed away from SW and L'), 'nok') +
          note(130, 205, t('分壓電阻靠近 FB 腳', 'divider right at the FB pin'), 'nok'),
        badNotes:[t('SW 節點大面積鋪銅：電壓劇烈跳動的天線，輻射 EMI 大', 'SW poured with lots of copper: an antenna swinging violently, high radiated EMI'),
                  t('FB 走線經過電感與 SW 下方，切換雜訊耦合進回授 → 頻率抖動、輸出不穩', 'FB passes under the inductor and SW; switching noise couples into feedback → jitter, unstable output'),
                  t('分壓電阻放在遠處，FB 高阻抗節點拉得很長', 'divider placed far away, so the high-impedance FB node is long')],
        goodNotes:[t('SW 只要夠走電流的寬度、越短越好', 'SW just wide enough for the current, as short as possible'),
                   t('FB 從輸出電容處取樣，走線遠離 SW 與電感', 'FB sensed at the output capacitor and routed away from SW and the inductor'),
                   t('分壓電阻緊貼 FB 腳，高阻抗節點最短', 'divider right at the FB pin so the high-impedance node is shortest')]
      };
    },
    ldo: () => {
      const ic = body(130, 78, 60, 62, 'LDO') + pin(124, 92, 8, 10, 'IN', 136, 100, 'start') + pin(188, 92, 8, 10, 'OUT', 184, 100, 'end') +
        pin(155, 136, 10, 8, 'GND', 160, 132) + pin(188, 120, 8, 8, 'SNS', 184, 127, 'end');
      const load = body(270, 78, 44, 50, t('負載', 'Load'));
      return {
        title:t('LDO：電容位置、地回路與遠端感測', 'LDO: capacitor placement, ground return and remote sense'),
        bad: board(320, 210) + trace([[10, 97], [128, 97]], 3) + partV(45, 97, 125, sub('C', 'IN'), 'left') +
          trace([[194, 97], [270, 97]], 2) + partV(250, 120, 150, sub('C', 'OUT'), 'left') + trace([[250, 97], [250, 116]], 2) +
          trace([[250, 154], [250, 192], [160, 192], [160, 144]], 2) + trace([[45, 129], [45, 192], [160, 192]], 2) + ic + load +
          zone(250, 135, 26, 32) + note(222, 185, t('C_OUT 離接腳遠、地回路細長', 'C_OUT far from the pins, long thin ground'), 'nb') +
          note(232, 88, t('細長走線 → 壓降', 'thin long trace → drop'), 'nb'),
        good: board(320, 210) + pour([[96, 140], [222, 140], [222, 172], [96, 172]]) + via(110, 160) + via(130, 160) + via(190, 160) + via(208, 160) +
          trace([[10, 97], [128, 97]], 6) + partV(110, 97, 140, sub('C', 'IN'), 'left') + trace([[194, 97], [270, 97]], 8) + partV(208, 97, 140, sub('C', 'OUT')) +
          ic + load + trace([[270, 120], [240, 120], [240, 124], [194, 124]], 1.5) + note(255, 140, t('感測線拉到負載', 'sense line to the load'), 'nok') +
          note(160, 190, t('電容緊貼接腳，寬而短的地', 'caps hug the pins, short wide ground'), 'nok'),
        badNotes:[t('C<sub>OUT</sub> 放在負載旁、離 LDO 很遠：走線電感與電阻改變了等效 ESR / ESL，可能振盪', 'C<sub>OUT</sub> near the load, far from the LDO: trace L and R change the effective ESR / ESL, risking oscillation'),
                  t('地回路細長、又和其他電流共用 → 雜訊與誤差', 'long thin ground shared with other currents → noise and error'),
                  t('細長的輸出走線造成壓降，負載端電壓偏低', 'the thin output trace drops voltage, so the load sees less')],
        goodNotes:[t('C<sub>IN</sub>、C<sub>OUT</sub> 緊貼 IN / OUT 腳，地端短而寬直接回到 GND 腳', 'C<sub>IN</sub> and C<sub>OUT</sub> right at the IN / OUT pins, ground short and wide back to the GND pin'),
                   t('遠端感測（SNS）拉到負載處，補償走線壓降', 'remote sense (SNS) taken at the load to cancel trace drop'),
                   t('輸出用寬走線，地平面用過孔連接', 'wide output trace; ground plane joined with vias')]
      };
    },
    thermal: () => {
      const qfn = '<rect class="chip" x="115" y="55" width="90" height="90" rx="4" style="fill-opacity:.35"/>' + note(160, 34, t('QFN 外框', 'QFN outline'), 'pinl');
      const pins = [0, 1, 2, 3, 4].map(i => pad(122 + i * 17, 148, 8, 10) + pad(122 + i * 17, 42, 8, 10)).join('');
      const vias = [0, 1, 2].flatMap(i => [0, 1, 2].map(j => via(138 + i * 22, 78 + j * 22))).join('');
      return {
        title:t('散熱墊、熱過孔與銅箔面積', 'Thermal pad, thermal vias and copper area'),
        bad: board(320, 210) + pad(130, 70, 60, 60) + pins + qfn +
          '<ellipse class="void" cx="148" cy="88" rx="9" ry="7"/><ellipse class="void" cx="172" cy="112" rx="11" ry="8"/><ellipse class="void" cx="150" cy="118" rx="6" ry="5"/>' +
          note(160, 178, t('沒有過孔、銅箔只有焊墊大小、焊錫空洞', 'no vias, copper only pad-sized, solder voids'), 'nb') +
          note(160, 194, sub('θ', 'JA') + ' ≈ 80 °C/W', 'nb'),
        good: board(320, 210) + pour([[20, 30], [300, 30], [300, 170], [20, 170]]) + pad(130, 70, 60, 60) + vias + pins + qfn +
          [40, 70, 250, 280].flatMap(x => [60, 100, 140].map(y => via(x, y))).join('') +
          note(160, 188, t('3×3 熱過孔接內層地平面、大面積銅', '3×3 thermal vias to inner ground, large copper'), 'nok') +
          note(160, 203, sub('θ', 'JA') + ' ≈ 40 °C/W', 'nok'),
        badNotes:[t('熱只能從焊墊附近的小塊銅散出去', 'heat can only spread through the small copper around the pad'),
                  t('焊錫空洞超過 30–50% 會明顯提高熱阻', 'voids above 30–50% clearly raise thermal resistance'),
                  t('同一顆晶片，接面溫度可能高一倍，提早熱關機', 'the same chip may run twice as hot above ambient and hit thermal shutdown early')],
        goodNotes:[t('散熱墊下 3×3（或更多）熱過孔，把熱導到內層地平面', '3×3 (or more) thermal vias under the pad carry heat to the inner ground plane'),
                   t('表層也鋪大面積銅，周圍再加過孔', 'large copper on the top layer too, with more vias around'),
                   t('過孔塞孔或蓋阻焊，避免焊錫流失造成空洞', 'plug or tent the vias so solder does not wick away and leave voids')]
      };
    }
  };

  function render(fig){
    const f = FIGS[fig.dataset.fig]; if(!f) return;
    const d = f();
    const side = (kind, svg, notes) => '<div class="side ' + kind + '"><div class="side-h">' + (kind === 'bad' ? t('✗ 不好', '✗ Bad') : t('✓ 好', '✓ Good')) + '</div>' +
      '<svg viewBox="0 0 320 210" role="img" aria-label="' + d.title + ' — ' + (kind === 'bad' ? t('不好的佈局', 'bad layout') : t('好的佈局', 'good layout')) + '">' + svg + '</svg>' +
      '<ul>' + notes.map(n => '<li>' + n + '</li>').join('') + '</ul></div>';
    fig.innerHTML = side('bad', d.bad, d.badNotes) + side('good', d.good, d.goodNotes) +
      '<figcaption>' + d.title + t('（PCB 正上方俯視示意；實線為表層銅，虛線為內層走線）', ' (top view of the PCB, schematic; solid copper is the top layer, dashed traces are on an inner layer)') + '</figcaption>';
  }
  // keep every label inside the 320-wide board, whatever the language: shrink a little, then nudge back inside
  function fit(fig){
    fig.querySelectorAll('svg').forEach(svg => svg.querySelectorAll('text').forEach(tx => {
      let bb = tx.getBBox();
      if(bb.width > 304){ const fs = parseFloat(getComputedStyle(tx).fontSize) || 11; tx.style.fontSize = (fs * 304 / bb.width).toFixed(2) + 'px'; bb = tx.getBBox(); }
      const x = parseFloat(tx.getAttribute('x'));
      if(bb.x < 6) tx.setAttribute('x', (x + 6 - bb.x).toFixed(1));
      else if(bb.x + bb.width > 314) tx.setAttribute('x', (x - (bb.x + bb.width - 314)).toFixed(1));
    }));
  }
  document.querySelectorAll('figure.cmp[data-fig]').forEach(f => { render(f); fit(f); });
})();
