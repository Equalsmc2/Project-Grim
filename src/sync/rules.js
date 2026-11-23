// Generated from firebase-rtdb.rules.json (tests/v2/rules.test.mjs keeps them identical).
// Embedded so the GM deck can copy the rules even where hosting does not publish the JSON file.
export const FIREBASE_RULES = {
  "rules": {
    ".read": false,
    ".write": false,
    "grim": {
      "rooms": {
        "$roomId": {
          ".read": "auth != null",
          ".write": "auth != null && ((!data.exists() && newData.child('dmUid').val() === auth.uid) || (data.child('dmUid').val() === auth.uid && newData.child('dmUid').val() === auth.uid))",
          ".validate": "newData.hasChildren(['dmUid', 'mode', 'sceneId']) && newData.child('dmUid').isString()"
        }
      },
      "tables": {
        "$table": {
          ".read": "auth != null",
          ".write": "auth != null && newData.exists() && root.child('grim/rooms').child(newData.child('room').val()).child('dmUid').val() === auth.uid && (!data.exists() || data.child('dmUid').val() === auth.uid || !root.child('grim/rooms').child(data.child('room').val()).exists())",
          ".validate": "newData.hasChildren(['room', 'dmUid', 'active', 'at']) && newData.child('room').isString() && newData.child('room').val().matches(/^[a-z0-9-]{1,60}$/) && newData.child('dmUid').val() === auth.uid && newData.child('active').isBoolean() && newData.child('at').isNumber()",
          "room": {
            ".validate": true
          },
          "dmUid": {
            ".validate": true
          },
          "active": {
            ".validate": true
          },
          "at": {
            ".validate": true
          },
          "$other": {
            ".validate": false
          }
        }
      },
      "claims": {
        "$roomId": {
          ".read": "auth != null",
          "$characterId": {
            ".write": "auth != null && root.child('grim/rooms').child($roomId).exists() && ((!data.exists() && newData.child('uid').val() === auth.uid) || (data.child('uid').val() === auth.uid && (!newData.exists() || newData.child('uid').val() === auth.uid)) || root.child('grim/rooms').child($roomId).child('dmUid').val() === auth.uid)",
            ".validate": "newData.hasChildren(['uid', 'at']) && newData.child('uid').isString() && newData.child('uid').val().length > 0 && newData.child('uid').val().length <= 128 && newData.child('at').isNumber()",
            "uid": {
              ".validate": true
            },
            "at": {
              ".validate": true
            },
            "$other": {
              ".validate": false
            }
          }
        }
      },
      "playerEdits": {
        "$roomId": {
          ".read": "auth != null",
          "$characterId": {
            "$uid": {
              "$field": {
                ".write": "auth != null && root.child('grim/rooms').child($roomId).exists() && auth.uid === $uid && root.child('grim/claims').child($roomId).child($characterId).child('uid').val() === auth.uid && ($field === 'level' || $field === 'maxHp' || $field === 'hp' || $field === 'tempHp' || $field === 'ac' || $field === 'initiative' || $field === 'perception' || $field === 'name' || $field === 'ancestry' || $field === 'className' || $field === 'conditions' || $field === 'avatar' || $field === 'mapMove') && newData.exists() && (!data.exists() || newData.child('revision').val() > data.child('revision').val())",
                ".validate": "newData.hasChildren(['revision', 'value']) && newData.child('revision').isNumber() && newData.child('revision').val() > 0 && newData.child('revision').val() < 9000000000000000 && ($field === 'avatar' ? (newData.child('value').isString() && newData.child('value').val().matches(/^v1-[0-9a-z]{16}$/)) : ($field === 'mapMove' ? (newData.child('value').isString() && newData.child('value').val().matches(/^(up|down|left|right)$/)) : ($field === 'conditions' ? (newData.child('value').isString() && newData.child('value').val().length <= 220) : (($field === 'name' || $field === 'ancestry' || $field === 'className') ? (newData.child('value').isString() && newData.child('value').val().length > 0 && newData.child('value').val().length <= 48) : (newData.child('value').isNumber() && newData.child('value').val() >= -100 && newData.child('value').val() <= 9999)))))"
              }
            }
          }
        }
      },
      "chat": {
        "$roomId": {
          ".read": "auth != null",
          "$msgId": {
            ".write": "auth != null && !data.exists() && root.child('grim/rooms').child($roomId).exists()",
            ".validate": "newData.hasChildren(['uid','name','text','at']) && newData.child('uid').val() === auth.uid && newData.child('name').isString() && newData.child('name').val().length > 0 && newData.child('name').val().length <= 48 && newData.child('text').isString() && newData.child('text').val().length > 0 && newData.child('text').val().length <= 300 && newData.child('at').isNumber() && newData.child('at').val() <= now + 60000 && (!newData.child('toStage').exists() || newData.child('toStage').isBoolean())",
            "$other": {
              ".validate": "$other === 'uid' || $other === 'name' || $other === 'text' || $other === 'at' || $other === 'toStage'"
            }
          }
        }
      }
    }
  }
};
