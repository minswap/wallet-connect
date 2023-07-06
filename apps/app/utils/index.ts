/* eslint-disable unused-imports/no-unused-vars */
import { SubmitTxRequest, TRpc, UtxoRequest, UtxoResponse } from '@minswap/wallet-connect';

export class WalletConnectRpc implements TRpc {
  getUtxos(params: UtxoRequest): Promise<UtxoResponse> {
    return Promise.resolve([
      '828258201664a8e468b30b6ea2c00c11f9a9dda64a6814d66ccbd9bfc73c940aaf6af8bf0082583901e9a5e9be2940740d33efc004e9a3835766c9ef4c422ed00cf7c4bfa1e45c4c8895ff4da15c38d4cf0d90bae5f0a7df717dc5e912878590c21a07459280',
      '828258201b3d8c6990e5e218f12dc98297bb909bb8b026bc48e2bdcb8f32a3a8abef955e008258390101986a78d618f446f3da79835e795078a7250becfdfd2bd266675012e45c4c8895ff4da15c38d4cf0d90bae5f0a7df717dc5e912878590c21a2929d915',
      '8282582029c2ee36810daf6aec45c7f443d19e5a6e073f7be665bb8cb4c3122df76571c4018258390165fc42e22008193de7a306e5fe9fd2f577c152405566e88cb9799936e45c4c8895ff4da15c38d4cf0d90bae5f0a7df717dc5e912878590c21a166653ef',
      '828258202b78a40507afc4028a79be28f5f1263b64a00b09bd192ed4b16deb80f336faaf028258390165fc42e22008193de7a306e5fe9fd2f577c152405566e88cb9799936e45c4c8895ff4da15c38d4cf0d90bae5f0a7df717dc5e912878590c21a038b5849',
      '8282582030db1ce1b534a8eec0140aee818a26a76c517eb0a8f7ccfe1a1f344f3a13a318028258390165fc42e22008193de7a306e5fe9fd2f577c152405566e88cb9799936e45c4c8895ff4da15c38d4cf0d90bae5f0a7df717dc5e912878590c2821a00115cb0a1581c29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6a1434d494e18e2',
      '828258204e0ddc97790aaeef250c3abd1184d6ecef2680eaf6b1af8e1a15e2eb89150f94018258390165fc42e22008193de7a306e5fe9fd2f577c152405566e88cb9799936e45c4c8895ff4da15c38d4cf0d90bae5f0a7df717dc5e912878590c21a000f4240',
      '828258204e29eb277679800f98a0d4efddf4f0ebac00205acdc2a3c8f264b5268bf3a5ad0182583901ded5fdf252ea3c13a82c3e720a05100a962cc187a62c4eee86bcf598e45c4c8895ff4da15c38d4cf0d90bae5f0a7df717dc5e912878590c21a286137da',
      '828258208927d16bb7102b085b2f14f513e29c794e1caf95c8059fff5f01180722a9bd4a0182583901756bd1b4f8e9c8ee8c4e1bcd0ab84b37e629c3c78296bec466d6412be45c4c8895ff4da15c38d4cf0d90bae5f0a7df717dc5e912878590c2821a2f2aa8e8a1581c29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6a1434d494e1b00000069751f37ae',
      '828258208ae3d165c5b09198ed615c9f14db2df7cbb55f8d7b4bef22aef0148cf19e770f0082583901000326b59dd95df471cb338326b8b35452cbe5955585efb954855fb7e45c4c8895ff4da15c38d4cf0d90bae5f0a7df717dc5e912878590c21a004c4b40',
      '82825820b239bb534fefb9b3affd643061af6c8cd1e3a8e980e3051e1c3c5dc4e9f7d38d008258390183329e1e5e2e786574e2fc0748859d159c5de264192167df0f084369e45c4c8895ff4da15c38d4cf0d90bae5f0a7df717dc5e912878590c21a05e506a2',
      '82825820cd93f5eebe8ae5e7d2ed5c8560c4601788b0802c98d804a47016c6f8801f0d8a0282583901b79422d35de3a4fafbb2fa8871560905d1e8c205ae5edd8a5b71df6ee45c4c8895ff4da15c38d4cf0d90bae5f0a7df717dc5e912878590c2821a0301d8e9a1581cefd7bd84c73fa01400d3c892365ce90b203981aab678bcffb6f3406aa14931373730333038393101',
      '82825820e477053138d03f61804a787b99f5497a57e6f424fd058940e07a55d76ca26962028258390103818c5c6dd3494b73c020a97dbcc74f657dd73e369e2ca329236bcae45c4c8895ff4da15c38d4cf0d90bae5f0a7df717dc5e912878590c2821a00d3d58ba1581cf66d78b4a3cb3d37afa0ec36461e51ecbde00f26c8f0a68f94b69880a144695553441a00160755',
      '82825820e477053138d03f61804a787b99f5497a57e6f424fd058940e07a55d76ca26962038258390103818c5c6dd3494b73c020a97dbcc74f657dd73e369e2ca329236bcae45c4c8895ff4da15c38d4cf0d90bae5f0a7df717dc5e912878590c2821a0a76a794a1581cf66d78b4a3cb3d37afa0ec36461e51ecbde00f26c8f0a68f94b69880a144695553441a00160756',
      '82825820e9ab0b42525f68af5f6da7f3f193c78e92aea454407db6fa5d9c93ac668d979602825839018840f68873fa51f3b096dd847bd7b7ecab3b9202add9b226ca77fa9de45c4c8895ff4da15c38d4cf0d90bae5f0a7df717dc5e912878590c21a000ed7fb',
      '82825820e9ab0b42525f68af5f6da7f3f193c78e92aea454407db6fa5d9c93ac668d979603825839018840f68873fa51f3b096dd847bd7b7ecab3b9202add9b226ca77fa9de45c4c8895ff4da15c38d4cf0d90bae5f0a7df717dc5e912878590c21a00bd2a6c',
      '82825820eb1a066aa30397e9423972d2055d762bb28ae353adce71610d1db117f2bebeeb0182583901ee597dda82ef91684191226c18c65a1001639565d18160d9b6e19446e45c4c8895ff4da15c38d4cf0d90bae5f0a7df717dc5e912878590c2821a001e8480a1581c54ef11805333453c8c3d6fbaa0d4496ddeb94857e1d7f3411bb79489a143414452192710',
      '82825820f3c0841e00502b487e3c7c22cc0f44b3552516df094fb8990b58766ef7ead17a01825839018f6ce77ff67aa6ef06b71f2a6b885c73652685df144d4a2ae509d888e45c4c8895ff4da15c38d4cf0d90bae5f0a7df717dc5e912878590c2821a03495aa1a3581c0ece814aa1cc2c98981c7690083dbcb51c5bb1279ae408873d8c8762a158205976683677342b4f7a62492f64613050624361637841514b316a626f4566363901581c5653fadee9993813f02f37a9af55ca78e78bc89e6a7d9b38df1ffa5aa14642554e4348411b00000574fbde6000581cf0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9aa14c6275796d65637279702e746f01',
      '82825820f4ac52fa18e032f88f461f8887564dc5a817d539ccfe9c0a6bfd9afa821de8b90082583901aa5012d8f1ad043c03fb2f58ff57129745843e34cf301b59fd301431e45c4c8895ff4da15c38d4cf0d90bae5f0a7df717dc5e912878590c21a0118c300',
      '82825820f7d9b26a0713c1f534f567ec426b1d256cc06c4b96751e9089b11ba32fbb0fa10182583901743c6d727199cc5569cff3c8a0ecd2c94833a1841eaaac514923dbfae45c4c8895ff4da15c38d4cf0d90bae5f0a7df717dc5e912878590c21a04b4d4e0',
      '82825820fd701ad912a1e180c0258c11d1431c1779ef798692240af3879fe40dbd0b97c40082583901f081f6eaae55a2b0077fc125f16f91451aa59473562d86c470ed5150e45c4c8895ff4da15c38d4cf0d90bae5f0a7df717dc5e912878590c21a59851764'
    ]);
  }
  getBalance(params: UtxoRequest): Promise<string> {
    return Promise.resolve(
      '821b000000011a11d035a7581c0ece814aa1cc2c98981c7690083dbcb51c5bb1279ae408873d8c8762a158205976683677342b4f7a62492f64613050624361637841514b316a626f4566363901581c29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6a1434d494e1b00000069751f3890581c54ef11805333453c8c3d6fbaa0d4496ddeb94857e1d7f3411bb79489a143414452192710581c5653fadee9993813f02f37a9af55ca78e78bc89e6a7d9b38df1ffa5aa14642554e4348411b00000574fbde6000581cefd7bd84c73fa01400d3c892365ce90b203981aab678bcffb6f3406aa14931373730333038393101581cf0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9aa14c6275796d65637279702e746f01581cf66d78b4a3cb3d37afa0ec36461e51ecbde00f26c8f0a68f94b69880a144695553441a002c0eab'
    );
  }
  submitTx(params: SubmitTxRequest): Promise<string> {
    return Promise.resolve('xyz');
  }
}
