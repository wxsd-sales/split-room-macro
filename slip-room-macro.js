/********************************************************
Copyright (c) 2022 Cisco and/or its affiliates.
This software is licensed to you under the terms of the Cisco Sample
Code License, Version 1.1 (the "License"). You may obtain a copy of the
License at
               https://developer.cisco.com/docs/licenses
All use of the material herein must be in accordance with the terms of
the License. All rights not expressly granted by the License are
reserved. Unless required by applicable law or agreed to separately in
writing, software distributed under the License is distributed on an "AS
IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
or implied.
*********************************************************
 * 
 * Macro Author:      	William Mills
 *                    	Technical Solutions Specialist 
 *                    	wimills@cisco.com
 *                    	Cisco Systems
 * 
 * Version: 1-0-0
 * Released: 06/14/22
 * 
 * This is a simple macro which toggles on and off selected microphone
 * and speaker lines on a Webex Device. This is useful if you have a
 * meeting room which isn't always fully used and you want to disable
 * speakers at the back of the room or behind a divider.
 * 
 * 
 * Configure the desired input and output lines according to your devices 
 * hardware and the macro will do the rest. 
 * 
 ********************************************************/


import xapi from 'xapi';

//////////////////////////
////// Configuration /////
//////////////////////////

// Customise the Button/Panel controls name
const BUTTON_NAME = 'Room Controls';

const mics = [3, 4]       // Specify the Micophone lines
const speakers = [1]      // Specify the Speaker lines

//////////////////////////
/// Do not touch below ///
//////////////////////////


// This is the main function which initializes everything
async function main(){

  createPanel();          // Create UI controls

  await syncUI();         // Sync UI with current state

   // Listen for all toggle events
  xapi.Event.UserInterface.Extensions.Widget.Action.on(widgetEvent);

  // Listen for changes to the Audio Inputs & Outputs so we can
  // keep the UI updated
  xapi.Config.Audio.Input.Microphone.Mode.on(syncUI);
  xapi.Config.Audio.Output.Line.Mode.on(syncUI);

}

// Run our main function and begin monitoring events
main();


// This function will toggle the mic and speakers modes
// Send it true to enable them
// Send it false to disable them
function toggleSettings(state) {

  console.log(`Setting room to ${state? 'full' : 'split'}`);

  mics.forEach( (mic) => {
    xapi.Config.Audio.Input.Microphone[mic].Mode
      .set(state? 'On' : 'Off');
  })

  speakers.forEach( (speaker) => {
    xapi.Config.Audio.Output.Line[speaker].Mode
    .set(state? 'On' : 'Off');
  });

}


// This function handles user input events for the toggle widget
async function widgetEvent(event){

  if(event.WidgetId == 'room_toggle') {
    console.log(event.Value);
    toggleSettings(event.Value == 'on');
  }

}


// Updates the UI based on current configuration state
async function syncUI() {

  console.log('Syncing UI')

  // Get all mic and speaker configuration
  const inputs = await xapi.Config.Audio.Input.Microphone.get();
  const outputs = await xapi.Config.Audio.Output.Line.get();

  // Filter only those which which this macro controls
  const inputFilter = inputs.filter( input => 
    mics.map(String).includes(input.id) && (input.Mode == 'On')
  )

  const outputFilter = outputs.filter( output => 
    speakers.map(String).includes(output.id) && (output.Mode == 'On')
  )

  const state = mics.length == inputFilter.length && speakers.length == outputFilter.length;
 
  xapi.Command.UserInterface.Extensions.Widget.SetValue({
        WidgetId: 'room_toggle',
        Value: state ? 'on' : 'off',
      });


}

// Here we create the Button and Panel for the control UI
async function createPanel() {

  const panel = `
  <Extensions>
    <Version>1.8</Version>
    <Panel>
      <Order>1</Order>
      <Type>Statusbar</Type>
      <Icon>Sliders</Icon>
      <Color>#CF7900</Color>
      <Name>${BUTTON_NAME}</Name>
      <ActivityType>Custom</ActivityType>
      <Page>
        <Name>${BUTTON_NAME}</Name>
        <Row>
          <Name>Toggle full room</Name>
          <Options>size=4</Options>
          <Widget>
            <WidgetId>room_toggle</WidgetId>
            <Type>ToggleButton</Type>
            <Options>size=1</Options>
          </Widget>
        </Row>
        <Options/>
      </Page>
    </Panel>
  </Extensions>`;

  xapi.Command.UserInterface.Extensions.Panel.Save(
    { PanelId: 'room_controls' }, 
    panel
  )
  
}
