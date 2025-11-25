// Form step navigation for loan application
let currentStep = 1;
const totalSteps = 3;

function nextStep() {
    if (currentStep < totalSteps) {
        document.getElementById(`step-${currentStep}`).classList.add('hidden');
        currentStep++;
        document.getElementById(`step-${currentStep}`).classList.remove('hidden');
        updateProgressBar();
    }
}

function prevStep() {
    if (currentStep > 1) {
        document.getElementById(`step-${currentStep}`).classList.add('hidden');
        currentStep--;
        document.getElementById(`step-${currentStep}`).classList.remove('hidden');
        updateProgressBar();
    }
}

function updateProgressBar() {
    const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
}

// Loan amount slider
const loanSlider = document.getElementById('loan-amount');
const loanOutput = document.getElementById('loan-output');

if (loanSlider && loanOutput) {
    loanSlider.addEventListener('input', function() {
        loanOutput.textContent = `K ${this.value}`;
    });
}