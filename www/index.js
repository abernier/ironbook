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
const $step = document.querySelector('.step')
const $download = document.querySelector('.download')
const $again = document.querySelector('.again')

step(0)

$input.onchange = async function (e) {
  try {
    step(1)

    let started = false;
    function progress(data) {
      if (!started) {
        // first time progress is executed!
        step(2)
        started = true
      }

      const i18n = {
        'init': "",
        'tgz:downloaded': "Switching on the printer",
        'prince:scripts': "Feeding with paper",
        'prince:prepare': "Changing the yellow cartridge",
        'prince:convert': "Cleaning the print heads",
        'prince:processing': "Sheets output from the printer",
        's3:upload': "Binding the book",
        'done': "Ironbook complete"
      }

      $progress.innerText = data.progress
      $step.innerText = i18n[data.step] || "wait"
    }

    console.log('onchange', $input.files)
    const url = await ironbook.post($input.files[0], {progress})

    step(3)
    console.log('PDF', url)

    // 
    $download.href = url
  } catch(err) {
    console.error('💥', err)
  }
}

// $again.onclick = function (e) {
//   e.preventDefault()

//   step(0)
// }