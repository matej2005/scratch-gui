/*Some parts of the code are used from the Variable Manager.*/
export default async function ({ addon, console, msg }) {
  const vm = addon.tab.traps.vm;
  const debug = console.log;
  const OnlyEditingTarget = addon.settings.get("target");

  let inputsOPs = ['math_number', 'math_positive_number', "math_whole_number", 'motion_goto_menu', "text", "argument_reporter_string_number"]
  let ignoreBlocks = ["procedures_prototype"]
  let Cblocks = ["control_forever", "control_if", "control_repeat", "control_if_else", "control_repeat_until", "control_while"]
  let preventUpdate = false;
  let myTabID = 4;
  const manager = document.createElement("div");
  manager.classList.add(addon.tab.scratchClass("asset-panel_wrapper"), "sa-block-to-text");

  const CodeTable = document.createElement("table");//<table>
  const CodeTableHeading = document.createElement("span");//<span>
  CodeTableHeading.className = "sa-blocks-to-text-heading";//css
  CodeTable.appendChild(CodeTableHeading);//</span>
  manager.appendChild(CodeTable);//</table>

  const textTab = document.createElement("li");
  addon.tab.displayNoneWhileDisabled(textTab, { display: "flex" });
  textTab.classList.add(addon.tab.scratchClass("react-tabs_react-tabs__tab"), addon.tab.scratchClass("gui_tab"));
  // Cannot use number due to conflict after leaving and re-entering editor
  textTab.id = "react-tabs-sa-block-to-text";

  const textTabIcon = document.createElement("img");
  textTabIcon.draggable = false;
  textTabIcon.src = addon.self.getResource("/icon.svg") /* rewritten by pull.js */;
  textTab.appendChild(textTabIcon);

  const textTabText = document.createElement("span");
  textTabText.innerText = msg("code");
  textTab.appendChild(textTabText);
  function translateBlocksToText() {
  }
  function convertInput(input, value) {
    if (input === 'math_number' || input === 'math_positive_number' || input === "text") return "(" + value + ")"
  }
  function findTopLevel(sprite) {
    var TopBlocks = new Array()
    let blocks = sprite.blocks._blocks
    //debug("top ids<")
    for (var bl in blocks) {
      if (blocks[bl].topLevel) {
        //debug(bl)
        TopBlocks[bl] = bl;
        //return bl
      }
    }
    //debug(">")
    //debug(TopBlocks)
    //return tpbl
    return TopBlocks
  }
  function isEmpty(obj) {
    for (const prop in obj) {
      if (Object.hasOwn(obj, prop)) return false
    }
    return true;
  }
  function getInputOfBlock(input /*only ID of input*/, block, sprite) {
    var blocks = sprite.blocks._blocks;//blocks in sprite

    var nextInput = null
    function getInputValue(block, _opcode, _Ins) {//get values of complex input
      if (block == undefined) return

      let out = ""
      if (inputsOPs.includes(block.opcode)) {//virtual block, has value
        let fieldValue = block.fields
        for (let fl in fieldValue) {
          if (!_Ins) {
            out = fieldValue[fl].value

          }else{
            out = convertInput(block.opcode, fieldValue[fl].value)

          }
        }
        nextInput = null

      } else { //inner block, more complex
        let inputs = block.inputs//id
        let a
        for (let IN in inputs) {
          nextInput = inputs[IN].block
          out += getOneInputCell(nextInput, block.opcode)
          a++
        }
      }
      if (!_Ins) {
        out = _opcode + "(" + out + ")"
      }
      return out

    }
    function getOneInputCell(_nextInput, _opcode, _Ins) {
      nextInput = _nextInput
      let closeN = 0
      let InCouter = 5 //max inputs
      let out = ""
      while (1) {
        if (nextInput != null) {
          closeN++
          out += "" + getInputValue(blocks[nextInput], _opcode, _Ins)
        } else {
          //out += "".repeat(closeN-_Ins)
          return out
        }
        if (InCouter == 0) {
          return out
        }
        InCouter--
      }
    }
    let out = ""
    let inputs = blocks[input].inputs//get inputs of input
    let opcode = blocks[input].opcode//get opcode of input
    let Ins = 0
    if (isEmpty(inputs)) {//direct input
      for (let fl in blocks[input].fields) {
        //return convertInput(blocks[input].opcode, blocks[input].fields[fl].value)
        return blocks[input].fields[fl].value
      }
    } else {//complex input
      for (let IN in inputs) {
        nextInput = inputs[IN].block
        out += getOneInputCell(nextInput, opcode, Ins)
        Ins++
      }
      //return "("+out+")"
      return out
    }
    return null
  }
  function handleBlockDefinition(_block, sprite) {
    let blocks = sprite.blocks._blocks;//blocks in sprite
    let prototype = _block.inputs.custom_block.block
    let mutation = blocks[prototype].mutation
    return "function " + mutation.proccode + "(" + "){"
  }
  function handleSubstack(_block, _sprite) {
    let blocks = _sprite.blocks._blocks;//blocks in sprite
    let text = ""
    let block = _block
    let a = 4
    let substacks = new Array()
    let substack = 0
    while (1) {
      debug(block)
      let opcode = block.opcode
      let inputs = block.inputs
      //var id = block.id
      let next = block.next
      let afterC
      if (Cblocks.includes(opcode)) {//C block
        if ("SUBSTACK" in block.inputs) {
          text += "\r\n"+"....".repeat(substack) + opcode + "{\r\n"
          substack++//increase counter
          substacks[substack] = new Object //create new object for each substack
          substacks[substack].inside = block.inputs["SUBSTACK"].block//get some values in object
          substacks[substack].next = block.next
          afterC = block.next
          next = block.inputs["SUBSTACK"].block//get next block.id

        }
      } else {//normal block
        let inputText = ""
        for (var IN in inputs) {
          if (inputs[IN].name != "SUBSTACK") {
            inputText += "(" + getInputOfBlock(inputs[IN].block, block, _sprite) + ")"//inputs
          }
        }//each input
        text += "....".repeat(substack) + opcode + inputText+"\r\n"

        //text += "\t".repeat(substack) + opcode + "\r\n"
        debug(opcode)
        debug(substacks)
        debug(substack)
        /*if (substacks[substack].next == id) {
          text += "\r\n"+"\t".repeat(substack)+"}"
          next = substacks[substack].next
          substack --
        }else{*/
        if (next != undefined) {//next block
          next = block.next
          //debug("next: "+next)
        } else {//return after C
          if (!isEmpty(substacks[substack])) {
            next = substacks[substack].next
          }
          //debug("next: "+block.next)
          //text += "" + "\t".repeat(substack) + "}\r\n"

          substack--
          if (substack <= 0) {
            substack = 0
          }
          text += "" + "....".repeat(substack) + "}\r\n"
          if (substack === 0) {
            break;
          }
        }

      }
      if (!a) {
        break
      }
      if (next != undefined) {
        block = blocks[next]                 //get block[id]
      }
      a--
    }

    debug(text)
    return text
  }
  function printText() {
    const editingTarget = vm.runtime.getEditingTarget();
    //debug(vm)
    //let sprite = new Set(vm.runtime.targets.map((i) => i.sprite))
    let sprite = new Set(vm.runtime.targets)
    //debug(vm.runtime.targets)
    //const editingTarget = vm.runtime.getEditingTarget();
    //debug(editingTarget);
    //debug(sprite)
    if (OnlyEditingTarget) {
      sprite = [editingTarget]
    }
    sprite.forEach((_sprite, i) => {//sprites
      let blocks = _sprite.blocks._blocks
      debug(_sprite.blocks)
      const row = document.createElement("tr")//<tr>
      const SpriteCell = document.createElement("td") //nazev postavy <td>
      SpriteCell.className = "sa-block-to-text-sprite"
      SpriteCell.textContent = _sprite.sprite.name //print sprite name
      row.appendChild(SpriteCell)//</td>
      const CodeCell = document.createElement("td");  //bunka pro kod <td>
      CodeCell.className = "sa-block-to-text-code"
      CodeCell.textContent = ""
      row.appendChild(CodeCell);//</td>
      CodeTable.appendChild(row);//</tr>

      var _scripts = _sprite.blocks._scripts
      //debug(_scripts)
      for (var script in _scripts) {
        var ID = _scripts[script]
        var inside = false
        var fallback
        for (var bl in blocks) {//blocks
          var nextID = blocks[ID].next
          let block = blocks[ID]
          var blockOpcode = block.opcode
          function handleBlock(ID, _sprite) {
            let text = ""
            let inputs = block.inputs
            if (blockOpcode === "procedures_definition") {//handle procedures = custom blocks
              text += handleBlockDefinition(block, _sprite)
              inside = true
            } else {
              text += "\r\n";
              if (inside) {
                text += ".    .";
              }
              text += blockOpcode
              /*if (Cblocks.includes(blockOpcode)) {
                handleSubstack(block, _sprite)
                text += "{"
                if (!"SUBSTACK" in block.inputs) {
                  text += "\r\n}"
                  inside = false
                } else {
                  if ("SUBSTACK" in block.inputs) {
                    fallback = ID
                    nextID = block.inputs.SUBSTACK.block
                    inside = true
                  }
                }
              }*/
            }
            for (var IN in inputs) {
              if (inputs[IN].name != "SUBSTACK") {
                text += "(" + getInputOfBlock(inputs[IN].block, block, _sprite) + ")"//inputs
              }
            }//each input
            debug("new opcode: " + blockOpcode + ", id: " + ID + ", next: " + nextID + ", top: " + blocks[ID].topLevel + ", fallback: " + fallback + ", inside: " + inside)
            return text
          }
          if (!inputsOPs.includes(blockOpcode) || inputsOPs.includes(ignoreBlocks)) {
            if (Cblocks.includes(blockOpcode)) {
              CodeCell.textContent += handleSubstack(block, _sprite)
            } else {
              CodeCell.textContent += handleBlock(ID, _sprite)
            }
            //CodeCell.textContent += handleBlock(ID, _sprite)
            if (nextID == undefined) {
              if (inside) {
                CodeCell.textContent += "\r\n}"
                if (fallback != undefined) {
                  ID = blocks[fallback].next
                }
                inside = false
                break
              } else {
                break
              }
            } else {
              ID = nextID
            }
          }

        }//each block
        //if (!--levelCounter) {
        CodeCell.textContent += "\r\n";
        //}
      }//each top block

      /*CodeCell.textContent = hljs.highlight(CodeCell.textContent,
        { language: 'js' }
      ).value*/


      CodeCell.innerHTML = CodeCell.innerHTML.replace(/\r\n?/g, '<br />');//hack for inserting line break

    });//each sprite
    debug("done")
  }


  function fullReload() {
    if (addon.tab.redux.state?.scratchGui?.editorTab?.activeTabIndex !== myTabID) return;
    translateBlocksToText();

    while (CodeTable.firstChild) {
      CodeTable.removeChild(CodeTable.firstChild);
    }
    printText();

  }
  function quickReload() {
    if (addon.tab.redux.state?.scratchGui?.editorTab?.activeTabIndex !== myTabID || preventUpdate) return;
    //translateBlocksToText();
    printText();
  }
  function cleanup() {
    //clean all text code
  }
  textTab.addEventListener("click", (e) => {
    addon.tab.redux.dispatch({ type: "scratch-gui/navigation/ACTIVATE_TAB", activeTabIndex: myTabID });
  });
  function setVisible(visible) {
    if (visible) {
      textTab.classList.add(
        addon.tab.scratchClass("react-tabs_react-tabs__tab--selected"),
        addon.tab.scratchClass("gui_is-selected")
      );
      const contentArea = document.querySelector("[class^=gui_tabs]");
      contentArea.insertAdjacentElement("beforeend", manager);
      fullReload();
    } else {
      textTab.classList.remove(
        addon.tab.scratchClass("react-tabs_react-tabs__tab--selected"),
        addon.tab.scratchClass("gui_is-selected")
      );
      manager.remove();
      cleanup();
    }
  }

  addon.tab.redux.initialize();
  addon.tab.redux.addEventListener("statechanged", ({ detail }) => {
    if (detail.action.type === "scratch-gui/navigation/ACTIVATE_TAB") {
      setVisible(detail.action.activeTabIndex === myTabID);
    } else if (detail.action.type === "scratch-gui/mode/SET_PLAYER") {
      if (!detail.action.isPlayerOnly && addon.tab.redux.state.scratchGui.editorTab.activeTabIndex == myTabID) {
        // DOM doesn't actually exist yet
        queueMicrotask(() => setVisible(true));
      }
    }
  });
  vm.runtime.on("PROJECT_LOADED", () => {
    try {
      fullReload();
    } catch (e) {
      console.error(e);
    }
  });
  vm.runtime.on("TOOLBOX_EXTENSIONS_NEED_UPDATE", () => {
    try {
      fullReload();
    } catch (e) {
      console.error(e);
    }
  });

  const oldStep = vm.runtime._step;
  vm.runtime._step = function (...args) {
    const ret = oldStep.call(this, ...args);
    try {
      //quickReload();
    } catch (e) {
      console.error(e);
    }
    return ret;
  };

  addon.self.addEventListener("disabled", () => {
    if (addon.tab.redux.state.scratchGui.editorTab.activeTabIndex === myTabID) {
      addon.tab.redux.dispatch({ type: "scratch-gui/navigation/ACTIVATE_TAB", activeTabIndex: myTabID });
    }
  });

  while (true) {
    await addon.tab.waitForElement("[class^='react-tabs_react-tabs__tab-list']", {
      markAsSeen: true,
      reduxEvents: ["scratch-gui/mode/SET_PLAYER", "fontsLoaded/SET_FONTS_LOADED", "scratch-gui/locales/SELECT_LOCALE"],
      reduxCondition: (state) => !state.scratchGui.mode.isPlayerOnly,
    });
    addon.tab.appendToSharedSpace({ space: "afterSoundTab", element: textTab, order: myTabID });
  }
}
