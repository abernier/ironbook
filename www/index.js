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

const steps = ['select', 'filter', 'queued', 'processing', 'done', 'err']

function step(stepname) {
  $body.classList.remove(...steps)
  $body.classList.add(stepname)
}

const $body = document.querySelector('body')
const $input = document.querySelector('input')
const $progress = document.querySelector('.progress')
const $step = document.querySelector('.step')
const $download = document.querySelector('.download')
const $roundbtn = document.querySelector('.btn.round');

const $listing = document.querySelector('.listing');
const $chaptertpl = document.querySelector('template#tpl-chapter');
const $litpl = document.querySelector('template#tpl-li');
const $nbunits = document.querySelector('[data-nbunits]')
const $unitslimit = document.querySelector('[data-unitslimit]')

step('select')

async function post() {
  let started = false;
  function progress(data) {
    if (!started) {
      // first time progress is executed!
      step('processing')
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

  const filter = [...document.querySelectorAll('[type="checkbox"]')]
    .filter(el => el.checked === false)
    .map(el => el.value)
  console.log('filter=', filter)

  const url = await ironbook.post($input.files[0], {
    progress,
    filter,
    onAccepted: function () {
      step('queued')
    }
  })

  step('done')
  console.log('PDF', url)

  // 
  $download.href = url
}

function updateNbunits (limit) {
  const nbunits = [...document.querySelectorAll('[type="checkbox"]')].filter(el => el.checked === true).length;
  $nbunits.textContent = nbunits;
  if (nbunits > limit) {
    $nbunits.classList.add('toomuch')
    $roundbtn.classList.add('disabled')
  } else {
    $nbunits.classList.remove('toomuch')
    $roundbtn.classList.remove('disabled')
  }

  $unitslimit.textContent = limit
}

$input.onchange = async function (e) {
  console.log('onchange');

  await post().catch(err => {
    if (err.status === 422) {
      step('filter')

      console.log('err.data', err.data);

      //
      // render the <li>s
      //

      err.data.chapters.forEach(chap => {
        const $chapter = $chaptertpl.content.cloneNode(true);
        
        $chapter.querySelector('h2').textContent = chap.name;

        const $ul = $chapter.querySelector('ul');

        chap.units.forEach(unit => {
          const $li = $litpl.content.cloneNode(true);
          $li.querySelector('span').textContent = unit.name;
          
          const $checkbox = $li.querySelector('input[type="checkbox"]');
          $checkbox.value = unit.id;
          $checkbox.checked = !(unit.name.startsWith('[') || unit.name.startsWith('!'));
  
          $checkbox.onchange = function (e) {
            updateNbunits(err.data.limit)
          }
          
          $ul.appendChild($li)
        });

        $listing.appendChild($chapter)
      })

      updateNbunits(err.data.limit)
      return
    }

    console.error(err);
    step('err')
  })
}



$roundbtn.onclick = async function (e) {
  await post().catch(err => {
    if (err.status !== 422) {
      console.error(err);
      step('err')
    }
  })

}