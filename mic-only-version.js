/********************************************************
 * 
 * Macro Author:      	William Mills
 *                    	Technical Solutions Specialist 
 *                    	wimills@cisco.com
 *                    	Cisco Systems
 * 
 * Version: 1-0-0
 * Released: 11/29/23
 * 
 * This is a simple macro which toggles on and off selected microphones
 * on a Webex Device. This is useful if you have a when you have want to
 * have presenter or stage micphones enabled but only turn the audience 
 * microphones when required.
 * 
 * 
 * Configure the desired input and output lines according to your devices 
 * hardware and the macro will do the rest. 
 * 
 * Full Readme, source code and license agreement available on Github:
 * https://github.com/wxsd-sales/split-room-macro
 * 
 ********************************************************/


import xapi from 'xapi';

/*********************************************************
 * Configure the settings below
**********************************************************/

// Customise the Button/Panel controls name
const BUTTON_NAME = 'Room Audio';

const mics = [1, 2]       // Specify the Micophone lines


/*********************************************************
 * Main function to setup and add event listeners
**********************************************************/


// This is the main function which initializes everything
async function main() {
  createPanel();          // Create UI controls
  syncUI();         // Sync UI with current state

  // Listen for all toggle events
  xapi.Event.UserInterface.Extensions.Widget.Action.on(widgetEvent);

  // Listen for changes to the Audio Inputs so we keep the UI updated
  xapi.Config.Audio.Input.Microphone.Mode.on(syncUI);

  xapi.Status.SystemUnit.State.NumberOfActiveCalls.on(numCalls => {

    if (numCalls < 1) return
    console.log('Number of calls has increased to 1, displaying prompt and applying default');

    toggleSettings(false); // Set to Presenter Only

    xapi.Command.UserInterface.Message.Prompt.Display({
      Duration: 10,
      Text: 'Presenter Only Audio Profile Applied',
      Title: 'Room Audio Applied',
      FeedbackId: 'roomcontrol',
      "Option.1": 'Switch to Presenter & Audience',
      "Option.2": 'Leave as Presenter Only'
    });

  });

  xapi.Event.UserInterface.Message.Prompt.Response.on(event => {
    if (event.FeedbackId != 'roomcontrol') return
    console.log(`Room Control Feedback received, option [${event.OptionId}] selected`);
    toggleSettings(event.OptionId != 1);
  });
}

// Run our main function and begin monitoring events
main();


/*********************************************************
 * Additional functions for the macro create the UI Panel
 * and process events.
**********************************************************/

// This function will toggle the mic and speakers modes
// Send it true to enable them
// Send it false to disable them
function toggleSettings(state) {
  console.log(`Setting room to ${state ? 'Presenter & Audience' : 'Presenter Only'}`);
  mics.forEach((mic) => {
    console.log(`Setting Mic [${mic}] to Mode [${state ? 'On' : 'Off'}]`)
    xapi.Config.Audio.Input.Microphone[mic].Mode
      .set(state ? 'On' : 'Off');
  })
}


// This function handles user input events for the toggle widget
function widgetEvent(event) {
  if (event.WidgetId != 'roomcontrols-toggle') return
  console.log(`Room Controls Widget changed to [${event.Value}], toggling settings`);
  toggleSettings(event.Value == 'on');
}


// Updates the UI based on current configuration state
async function syncUI() {
  console.log('Syncing UI')

  // Get all mic and speaker configuration
  const inputs = await xapi.Config.Audio.Input.Microphone.get();

  // Filter only those which which this macro controls
  const inputFilter = inputs.filter(input =>
    mics.map(String).includes(input.id) && (input.Mode == 'On')
  )

  const state = mics.length == inputFilter.length;

  xapi.Command.UserInterface.Extensions.Widget.SetValue({
    WidgetId: 'roomcontrols-toggle',
    Value: state ? 'on' : 'off',
  });
}

// Here we create the Button and Panel for the control UI
async function createPanel() {

  const panel = `<Extensions>
                  <Panel>
                    <Order>2</Order>
                    <PanelId>roomcontrols</PanelId>
                    <Origin>local</Origin>
                    <Location>HomeScreenAndCallControls</Location>
                    <Icon>Sliders</Icon>
                    <Color>#CF7900</Color>
                    <Name>${BUTTON_NAME}</Name>
                    <ActivityType>Custom</ActivityType>
                    <Page>
                      <Name>${BUTTON_NAME}</Name>
                      <Row>
                        <Name>Toggle full room</Name>
                        <Widget>
                          <WidgetId>roomcontrols-presentertext</WidgetId>
                          <Name>Presenter Only</Name>
                          <Type>Text</Type>
                          <Options>size=null;fontSize=normal;align=center</Options>
                        </Widget>
                        <Widget>
                          <WidgetId>roomcontrols-toggle</WidgetId>
                          <Type>ToggleButton</Type>
                          <Options>size=1</Options>
                        </Widget>
                        <Widget>
                          <WidgetId>roomcontrols-presenteraudiencetext</WidgetId>
                          <Name>Presenter &amp; Audience</Name>
                          <Type>Text</Type>
                          <Options>size=null;fontSize=normal;align=center</Options>
                        </Widget>
                      </Row>
                      <PageId>roomcontrols-page</PageId>
                      <Options>hideRowNames=1</Options>
                    </Page>
                  </Panel>
                </Extensions>`;

  xapi.Command.UserInterface.Extensions.Panel.Save({ PanelId: 'roomcontrols' }, panel)

}
