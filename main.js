// Background Binary Animation
const bgContainer = document.getElementById('binary-bg');

function createBinaryDigit() {
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


// Calculator Logic
const revealBtn = document.getElementById('reveal-btn');
const calcResult = document.getElementById('calc-result');

revealBtn.addEventListener('click', () => {
  // Reset
  calcResult.style.color = '#2d3436';
  calcResult.classList.remove('shake');

  // Clear explanation
  const explanationDiv = document.getElementById('calc-explanation');
  explanationDiv.style.display = 'none';
  explanationDiv.innerText = '';

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
    calcResult.parentElement.classList.add('shake');
  }, 100);

  // Type explanation after a short delay
  setTimeout(() => {
    typeExplanation();
  }, 800);
}

async function typeExplanation() {
  const explanationDiv = document.getElementById('calc-explanation');
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


// Pizza Animation Logic
const startAnimBtn = document.getElementById('start-anim-btn');
const animStatus = document.getElementById('anim-status');
const decimalPizza = document.getElementById('decimal-pizza');
const binaryPizza = document.getElementById('binary-pizza');

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


// Navigation Logic
const navLinks = document.querySelectorAll('.nav-link');
const topicContents = document.querySelectorAll('.topic-content');

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    if (link.classList.contains('disabled')) return;

    const targetId = link.getAttribute('data-target');
    if (!targetId) return;

    // Update Nav
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    // Update Content
    topicContents.forEach(content => {
      content.classList.remove('active');
      if (content.id === targetId) {
        content.classList.add('active');
      }
    });
  });
});
