import * as ironbook from '/sdk.mjs?v=1';

console.log('👋')
  
//
// Configure the API endpoint
//
ironbook.configure({
  endpoint: `${location.protocol}//${location.host}`
});

//
// 
//

const steps = ['select', 'queued', 'processing', 'done']

function step(num) {
  $body.classList.remove(...steps)
  $body.classList.add(steps[num])
}

const $body = document.querySelector('body')
const $input = document.querySelector('input')
const $progress = document.querySelector('.progress')
const $download = document.querySelector('.download')
const $again = document.querySelector('.again')

step(0)

$input.onchange = async function (e) {

  step(1)

  let started = false;
  function progress(progress) {
    if (!started) {
      // first time progress is executed!
      step(2)
      started = true
    }

    $progress.innerText = progress
  }

  console.log('onchange', $input.files)
  const url = await ironbook.post($input.files[0], {progress})

  step(3)
  console.log('PDF', url)

  // 
  $download.href = url
}

$again.onclick = function (e) {
  e.preventDefault()

  step(0)
}