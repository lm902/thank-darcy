import * as openpgp from './node_modules/openpgp/dist/openpgp.mjs'

async function decryptButtonClick () {
  const dirHandle = await showDirectoryPicker({ mode: 'readwrite' })
  processDir(dirHandle, {})
}

async function processDir (dirHandle, passObj) {
  for await (let item of dirHandle.values()) {
    if (item instanceof FileSystemDirectoryHandle) {
      processDir(item, passObj)
    } else if (item instanceof FileSystemFileHandle && item.name.endsWith('.gpg')) {
      processFile(dirHandle, item, passObj)
        .then(x => log('Decrypted ' + item.name))
        .catch(x => log(item.name + ' Error: ' + x.message))
    }
  }
}

async function processFile (dirHandle, item, passObj) {
  if (!passObj.password) {
    passObj.password = prompt('Enter password for decryption:', '')
  }
  const file = await item.getFile()
  const msg = await openpgp.readMessage({ binaryMessage: file.stream() })
  let plainMsg
  try {
    plainMsg = await msg.decrypt(undefined, [passObj.password])
  } catch {
    passObj.password = prompt('The password did not work.\r\nEnter password for decryption:', '')
    return processFile(dirHandle, item, passObj)
  }
  const targetFileHandle = await dirHandle.getFileHandle(item.name.replace(/\.gpg$/, ''), { create: true })
  const writable = await targetFileHandle.createWritable()
  let packet = plainMsg.packets[0]
  while (packet?.packets?.length) {
    packet = packet.packets[0]
  }
  await writable.write(packet.data)
  await writable.close()
}

function log (content) {
  document.getElementById('log').textContent += content + '\r\n'
}

window.decryptButtonClick = decryptButtonClick
