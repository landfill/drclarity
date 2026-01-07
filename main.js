// Navigation Logic (Run First for Robustness)
const navLinks = document.querySelectorAll('.nav-link');
const topicContents = document.querySelectorAll('.topic-content');

if (navLinks.length > 0) {
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      // Allow disabled links to be clicked if we decided to enable them (Geometry is enabled now)
      if (link.classList.contains('disabled')) return;

      const targetId = link.getAttribute('data-target');
      if (!targetId) return;

      // Update Nav UI
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Update Content UI
      topicContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === targetId) {
          content.classList.add('active');

          // Trigger specific init logic for tabs
          if (targetId === 'topic-geometry') {
            // Safe call with delay to ensure rendering
            setTimeout(() => {
              if (typeof drawGeometryCorrected === 'function') {
                drawGeometryCorrected();
              }
            }, 50);
          }
        }
      });
    });
  });
}

// Background Binary Animation
const bgContainer = document.getElementById('binary-bg');
if (bgContainer) {
  function createBinaryDigit() {
    if (!bgContainer) return;
    const digit = document.createElement('div');
    digit.classList.add('binary-digit');
    digit.innerText = Math.random() > 0.5 ? '1' : '0';

    // Random position
    digit.style.left = Math.random() * 100 + 'vw';

    // Random duration
    const duration = Math.random() * 5 + 5; // 5-10s
    digit.style.animationDuration = duration + 's';

    bgContainer.appendChild(digit);

    // Remove after animation
    setTimeout(() => {
      digit.remove();
    }, duration * 1000);
  }
  // Create digits periodically
  setInterval(createBinaryDigit, 200);
}

// Calculator Logic
const revealBtn = document.getElementById('reveal-btn');
const calcResult = document.getElementById('calc-result');

if (revealBtn && calcResult) {
  revealBtn.addEventListener('click', () => {
    // Reset
    calcResult.style.color = '#2d3436';
    calcResult.classList.remove('shake');

    // Clear explanation
    const explanationDiv = document.getElementById('calc-explanation');
    if (explanationDiv) {
      explanationDiv.style.display = 'none';
      explanationDiv.innerText = '';
    }

    // Typing effect
    const result = "0.30000000000000004";
    let i = 0;
    calcResult.innerText = "";

    revealBtn.disabled = true;
    revealBtn.innerText = "계산 중...";

    const typeInterval = setInterval(() => {
      calcResult.innerText += result.charAt(i);
      i++;

      if (i >= result.length) {
        clearInterval(typeInterval);
        finishReveal();
      }
    }, 50);
  });

  function finishReveal() {
    revealBtn.innerText = "보셨나요?";
    revealBtn.disabled = false;

    // Highlight the error part
    calcResult.innerHTML = '0.30000000000000<span style="color: #e17055; font-weight: bold;">004</span>';

    // Shake effect
    setTimeout(() => {
      if (calcResult.parentElement) calcResult.parentElement.classList.add('shake');
    }, 100);

    // Type explanation after a short delay
    setTimeout(() => {
      typeExplanation();
    }, 800);
  }

  async function typeExplanation() {
    const explanationDiv = document.getElementById('calc-explanation');
    if (!explanationDiv) return;

    const text = `컴퓨터의 메모리는 한정되어 있어서 이 무한한 숫자를 어딘가에서 잘라내야(반올림) 합니다. 그래서 0.1 + 0.2를 계산하면 정확히 0.3이 아닌 0.30000000000000004 같은 결과가 나오는 것입니다.

이것이 바로 부동소수점(Floating Point) 연산 오류입니다. 금융 계산처럼 정확도가 중요한 곳에서는 이를 해결하기 위해 정수로 변환하거나 특별한 라이브러리를 사용합니다.`;

    explanationDiv.style.display = 'block';
    explanationDiv.innerText = '';

    let i = 0;
    const typeInterval = setInterval(() => {
      if (i < text.length) {
        explanationDiv.innerText += text.charAt(i);
        i++;
        // Auto scroll to bottom
        explanationDiv.scrollTop = explanationDiv.scrollHeight;
      } else {
        clearInterval(typeInterval);
      }
    }, 20); // Fast typing speed
  }
}


// Pizza Animation Logic
const startAnimBtn = document.getElementById('start-anim-btn');
const animStatus = document.getElementById('anim-status');
const decimalPizza = document.getElementById('decimal-pizza');
const binaryPizza = document.getElementById('binary-pizza');

if (startAnimBtn && animStatus && decimalPizza && binaryPizza) {
  startAnimBtn.addEventListener('click', runPizzaAnimation);

  async function runPizzaAnimation() {
    startAnimBtn.disabled = true;
    resetPizzas();

    // Step 1: Decimal Slicing
    animStatus.innerText = "10진법 피자를 10조각으로 자르는 중...";
    await sliceDecimalPizza();

    animStatus.innerText = "1/10조각 (0.1) 가져오기...";
    highlightDecimalSlice();
    await wait(2000);

    // Step 2: Binary Slicing
    animStatus.innerText = "2진법(반, 반의 반...)으로 0.1 맞춰보기...";
    const formula = await sliceBinaryPizza();

    // Step 3: Show Error
    animStatus.innerText = `${formula} + ... ≠ 0.1 (항상 부스러기가 남아요!)`;
    await showCrumb();

    startAnimBtn.disabled = false;
    startAnimBtn.innerText = "다시 자르기";
  }

  function resetPizzas() {
    decimalPizza.innerHTML = '';
    binaryPizza.innerHTML = '';
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function sliceDecimalPizza() {
    // Create 10 slices (5 lines)
    for (let i = 0; i < 5; i++) {
      const line = document.createElement('div');
      line.style.position = 'absolute';
      line.style.width = '2px';
      line.style.height = '100%';
      line.style.background = '#d63031';
      line.style.left = '50%';
      line.style.transform = `translateX(-50%) rotate(${i * 36}deg)`;
      decimalPizza.appendChild(line);
      await wait(500);
    }
  }

  function highlightDecimalSlice() {
    // Visually represent 0.1 (36 degrees)
    const slice = document.createElement('div');
    slice.style.position = 'absolute';
    slice.style.top = '0';
    slice.style.left = '0';
    slice.style.width = '100%';
    slice.style.height = '100%';
    slice.style.borderRadius = '50%';
    slice.style.background = 'conic-gradient(#e17055 0deg, #e17055 36deg, transparent 36deg)';
    slice.style.opacity = '0';
    slice.style.transition = 'opacity 0.5s';
    decimalPizza.appendChild(slice);

    // Force reflow
    slice.offsetHeight;
    slice.style.opacity = '1';
  }

  async function sliceBinaryPizza() {
    // 0.1 in binary is 0.0001100110011...
    const fractions = [
      { val: 1 / 2, label: "1/2 (너무 커요!)", keep: false },
      { val: 1 / 4, label: "1/4 (너무 커요!)", keep: false },
      { val: 1 / 8, label: "1/8 (너무 커요!)", keep: false },
      { val: 1 / 16, label: "1/16 (유지)", keep: true },
      { val: 1 / 32, label: "1/32 (유지)", keep: true },
      { val: 1 / 64, label: "1/64 (너무 커요!)", keep: false },
      { val: 1 / 128, label: "1/128 (너무 커요!)", keep: false },
      { val: 1 / 256, label: "1/256 (유지)", keep: true },
      { val: 1 / 512, label: "1/512 (유지)", keep: true },
      { val: 1 / 512, label: "1/512 (유지)", keep: true },
    ];

    let currentRotation = 0;
    let keptParts = [];

    for (const frac of fractions) {
      animStatus.innerText = `${frac.label} 시도 중...`;

      const slice = document.createElement('div');
      slice.style.position = 'absolute';
      slice.style.top = '0';
      slice.style.left = '0';
      slice.style.width = '100%';
      slice.style.height = '100%';
      slice.style.borderRadius = '50%';

      const degrees = 360 * frac.val;

      // Show slice temporarily (preview)
      slice.style.background = `conic-gradient(transparent ${currentRotation}deg, #74b9ff ${currentRotation}deg, #74b9ff ${currentRotation + degrees}deg, transparent ${currentRotation + degrees}deg)`;
      slice.style.opacity = '0.5';
      binaryPizza.appendChild(slice);

      await wait(1500);

      if (frac.keep) {
        // Keep it (turn darker)
        slice.style.background = `conic-gradient(transparent ${currentRotation}deg, #0984e3 ${currentRotation}deg, #0984e3 ${currentRotation + degrees}deg, transparent ${currentRotation + degrees}deg)`;
        slice.style.opacity = '1';
        currentRotation += degrees;

        // Add to kept parts (extract "1/16" from "1/16 (유지)")
        keptParts.push(frac.label.split(' ')[0]);
      } else {
        // Discard
        slice.remove();
      }
      await wait(800);
    }

    animStatus.innerText = "영원히 계속됩니다...";
    return keptParts.join(" + ");
  }

  async function showCrumb() {
    const crumb = document.createElement('div');
    crumb.classList.add('crumb');
    crumb.id = 'error-crumb';
    crumb.style.top = '50%';
    crumb.style.left = '50%';
    crumb.style.transform = 'rotate(36deg) translate(80px)';
    crumb.style.background = '#ff0000';
    crumb.style.opacity = '0';
    crumb.style.width = '20px';
    crumb.style.height = '20px';
    crumb.style.borderRadius = '50%';
    crumb.style.position = 'absolute';
    crumb.style.zIndex = '10';
    crumb.style.boxShadow = '0 0 20px 5px rgba(255, 0, 0, 0.9), 0 0 40px 10px rgba(255, 0, 0, 0.6)';
    crumb.style.border = '3px solid #ffffff';

    binaryPizza.appendChild(crumb);

    // Fade in the crumb
    await wait(100);
    crumb.style.transition = 'opacity 0.5s';
    crumb.style.opacity = '1';
    await wait(500);

    // Start pulsing immediately
    crumb.style.animation = 'pulse 1s infinite';
    await wait(2000);
  }
}


// Geometry Logic & Solution Steps
const geometryCanvas = document.getElementById('geometry-canvas');
const ctx = geometryCanvas ? geometryCanvas.getContext('2d') : null;

// UI Elements
const btnNext = document.getElementById('btn-next-step');
const btnReset = document.getElementById('btn-reset');
const stepText = document.getElementById('step-description');
const mainExplanation = document.getElementById('main-explanation');
const hintText = document.getElementById('hint-text');

// State
let currentStep = 0;
const TOTAL_STEPS = 5;
let animationFrameId = null; // For cancelling animations

// --- Step Definitions (Content from sol.md) ---
const steps = [
  {
    // Step 0: Intro
    text: "문제: 큰 사분원(R=6) 안에 두 개의 반원이 있습니다. 빨간색 영역의 넓이를 구해보세요.",
    hint: "첫 번째 단계는 '원의 중심'을 찾는 것입니다.",
    draw: () => drawProblemState()
  },
  {
    // Step 1: Centers & Lines
    text: "1. 원의 중심을 찾고 선을 그어야 합니다. 두 원이 접할 때, <strong>중심을 이은 선은 반드시 접점을 지납니다.</strong>",
    hint: "이 성질은 '오뚜기'처럼 두 원이 맞닿아 움직여도 항상 성립합니다.",
    action: () => playOttogiAnimation(), // Trigger animation
    draw: () => { drawProblemState(); drawCentersAndLines(false); } // Static state after anim (handled in action)
  },
  {
    // Step 2: Triangle
    text: "2. 중심을 이으면 <strong>직각삼각형</strong>이 만들어집니다. 변의 길이를 반지름(x)으로 표현해봅시다.",
    hint: "높이는 전체 높이(6)에서 x를 뺀 값입니다.",
    draw: () => { drawProblemState(); drawCentersAndLines(false); drawTriangleVars(); }
  },
  {
    // Step 3: Pythagoras
    text: "3. 피타고라스 정리를 이용합니다. 복잡한 식 대신 <strong>3:4:5 비율</strong>을 대입해보면, <strong>x=2</strong>임이 명확해집니다.",
    hint: "3² + 4² = 5² 이므로 x=2 입니다.",
    draw: () => { drawProblemState(); drawCentersAndLines(false); drawTriangleSolved(); }
  },
  {
    // Step 4: Final Calc Setup (Formula)
    text: "4. 이제 최종 면적을 계산할 수 있습니다. 원의 넓이 공식: <span class='math-formula'>πr²</span>",
    hint: "큰 사분원 - (중간 반원 + 작은 반원)",
    htmlContent: "식: P = <span class='math-formula'>9π - 4.5π - 2π</span>",
    draw: () => { drawProblemState(); drawTriangleSolved(); }
  },
  {
    // Step 5: Answer
    text: "정답 도출! 9π - 6.5π = <span class='math-formula'>2.5π</span>",
    hint: "복잡한 계산 없이 도형의 성질로 해결했습니다.",
    draw: () => { drawProblemState(); drawTriangleSolved(); drawFinalAnswer(); }
  }
];


// Event Listeners
if (btnNext) {
  btnNext.addEventListener('click', () => {
    if (currentStep < TOTAL_STEPS) {
      currentStep++;
      updateUI();
    }
  });
}

if (btnReset) {
  btnReset.addEventListener('click', () => {
    currentStep = 0;
    cancelAnimationFrame(animationFrameId);
    updateUI();
  });
}

function updateUI() {
  const stepData = steps[currentStep];
  if (!stepData) return;

  // Update Text with HTML support
  stepText.innerHTML = stepData.text;
  if (stepData.htmlContent) {
    stepText.innerHTML += "<br>" + stepData.htmlContent;
  }

  if (hintText) hintText.innerHTML = stepData.hint;

  // Update Buttons
  if (currentStep === 0) {
    btnNext.innerText = "풀이 시작";
    btnReset.style.display = 'none';
  } else if (currentStep >= TOTAL_STEPS) {
    btnNext.style.display = 'none';
    btnReset.style.display = 'inline-block';
  } else {
    btnNext.innerText = "다음 단계";
    btnNext.style.display = 'inline-block';
    btnReset.style.display = 'inline-block';
  }

  // Custom Action or Draw
  if (stepData.action) {
    stepData.action();
  } else if (stepData.draw) {
    stepData.draw();
  }
}


// Geometry Constants
const SCALE = 50;
const ORIGIN_X = 40;
const ORIGIN_Y = 360;

function toCanvasX(x) { return ORIGIN_X + x * SCALE; }
function toCanvasY(y) { return ORIGIN_Y - y * SCALE; }


/* --- Drawing Helper Functions --- */

// Base Problem visualization
function drawProblemState() {
  ctx.clearRect(0, 0, geometryCanvas.width, geometryCanvas.height);
  drawAxes();

  // 1. Base Quarter Circle (RED)
  ctx.beginPath();
  ctx.moveTo(toCanvasX(0), toCanvasY(0));
  ctx.arc(toCanvasX(0), toCanvasY(0), 6 * SCALE, 1.5 * Math.PI, 0, false);
  ctx.lineTo(toCanvasX(0), toCanvasY(0));
  ctx.fillStyle = '#ff7675';
  ctx.fill();
  ctx.strokeStyle = '#2d3436';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 2. Bottom Semicircle (White)
  ctx.beginPath();
  ctx.arc(toCanvasX(3), toCanvasY(0), 3 * SCALE, Math.PI, 0, false);
  ctx.fillStyle = '#FFFBF0';
  ctx.fill();
  ctx.strokeStyle = '#2d3436';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 3. Hanging Semicircle (Fixed x=2) (White)
  const x = 2;
  const centerY = 6 - x; // 4
  ctx.beginPath();
  ctx.arc(toCanvasX(0), toCanvasY(centerY), x * SCALE, 1.5 * Math.PI, 0.5 * Math.PI, false);
  ctx.fillStyle = '#FFFBF0';
  ctx.fill();
  ctx.strokeStyle = '#2d3436';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawAxes() {
  ctx.beginPath();
  ctx.moveTo(ORIGIN_X, 0); ctx.lineTo(ORIGIN_X, geometryCanvas.height);
  ctx.moveTo(0, ORIGIN_Y); ctx.lineTo(geometryCanvas.width, ORIGIN_Y);
  ctx.strokeStyle = '#b2bec3';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#636e72';
  ctx.font = 'bold 16px Outfit';
  ctx.fillText("6", toCanvasX(6) - 5, toCanvasY(0) + 20);
  ctx.fillText("0", toCanvasX(0) - 15, toCanvasY(0) + 20);
}

// Step 1: Ottogi Animation + Line Drawing
async function playOttogiAnimation() {
  // 1. Show Ottogi Concept (Sidebar or Overlay)
  // Actually, let's animate the two circles "wiggling" to show tangency
  // We will redraw the scene with the hanging circle rotating slightly

  const startTime = Date.now();
  const duration = 2500; // 2.5 seconds of wiggling

  function animate() {
    const now = Date.now();
    const elapsed = now - startTime;

    if (elapsed < duration) {
      // Wiggle calculation
      const angle = Math.sin(elapsed / 200) * 0.1; // Small sway

      // Re-draw base
      drawProblemState();

      // Draw "Ghost" Ottogi visualization
      // Just visualize the connection line moving with the center
      // Let's rock the hanging center slightly
      const baseX = 0;
      const baseY = 4;
      // Rocking center
      const rockX = Math.sin(angle) * 0.5;
      const rockY = baseY + Math.cos(angle) * 0.1; // slight dip

      // Draw phantom line indicating "Always connected"
      ctx.beginPath();
      ctx.moveTo(toCanvasX(3), toCanvasY(0));
      ctx.lineTo(toCanvasX(rockX), toCanvasY(rockY));
      ctx.strokeStyle = '#e17055';
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label "Tangency"
      ctx.fillStyle = '#d63031';
      ctx.font = 'bold 16px Outfit';
      ctx.fillText("항상 접점을 지남!", toCanvasX(1.5), toCanvasY(2));

      animationFrameId = requestAnimationFrame(animate);
    } else {
      // End animation -> Draw final static state
      drawProblemState();
      animateLineDrawing();
    }
  }
  animate();
}

function animateLineDrawing() {
  let progress = 0;
  function lineStep() {
    if (progress <= 1) {
      drawProblemState();

      // Draw Points
      drawPoint(3, 0, '#0984e3');
      drawPoint(0, 4, '#0984e3');

      // Draw Partial Line
      const startX = toCanvasX(3);
      const startY = toCanvasY(0);
      const endX = toCanvasX(0);
      const endY = toCanvasY(4);

      const currX = startX + (endX - startX) * progress;
      const currY = startY + (endY - startY) * progress;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(currX, currY);
      ctx.strokeStyle = '#0984e3';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      progress += 0.05;
      animationFrameId = requestAnimationFrame(lineStep);
    } else {
      drawCentersAndLines(false); // Finalize
    }
  }
  lineStep();
}

function drawCentersAndLines(animate = false) {
  if (animate) return; // Logic handled in animate functions usually

  const x = 2;
  const centerY = 4;

  drawPoint(3, 0, '#0984e3');
  drawPoint(0, centerY, '#0984e3');

  ctx.beginPath();
  ctx.moveTo(toCanvasX(3), toCanvasY(0));
  ctx.lineTo(toCanvasX(0), toCanvasY(centerY));
  ctx.strokeStyle = '#0984e3';
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawTriangleVars() {
  const centerY = 4;

  // Triangle Outline
  ctx.beginPath();
  ctx.moveTo(toCanvasX(0), toCanvasY(0)); // Origin
  ctx.lineTo(toCanvasX(3), toCanvasY(0)); // Bottom Right
  ctx.lineTo(toCanvasX(0), toCanvasY(centerY)); // Top Left
  ctx.lineTo(toCanvasX(0), toCanvasY(0)); // Close
  ctx.strokeStyle = 'rgba(9, 132, 227, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Labels
  ctx.font = 'bold 18px Outfit';
  ctx.fillStyle = '#d63031';

  // Bottom: 3
  ctx.fillText("3", toCanvasX(1.5), toCanvasY(-0.4));

  // Hypotenuse: 3+x
  ctx.fillText("3+x", toCanvasX(1.6), toCanvasY(2.2));

  // Vertical: 6-x (Improved Visibility)
  // Draw a bracket or leader line to avoid overlap with axis
  const labelX = toCanvasX(-0.8);
  const labelY = toCanvasY(2);

  ctx.fillText("6-x", labelX, labelY);

  // Leader line
  ctx.beginPath();
  ctx.moveTo(labelX + 25, labelY - 5);
  ctx.lineTo(toCanvasX(-0.1), labelY - 5);
  ctx.strokeStyle = '#636e72';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawTriangleSolved() {
  const centerY = 4;

  // Labels 3-4-5
  ctx.font = 'bold 24px Outfit';
  ctx.fillStyle = '#00b894';

  ctx.fillText("3", toCanvasX(1.5), toCanvasY(-0.4));
  ctx.fillText("5", toCanvasX(1.6), toCanvasY(2.2));

  // Vertical 4
  ctx.fillText("4", toCanvasX(-0.5), toCanvasY(2));
}

function drawFinalAnswer() {
  // Just highlight visual if needed, but text covers it.
}

function drawPoint(x, y, color) {
  ctx.beginPath();
  ctx.arc(toCanvasX(x), toCanvasY(y), 5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// Init
if (geometryCanvas) {
  setTimeout(() => {
    updateUI();
  }, 100);
}

