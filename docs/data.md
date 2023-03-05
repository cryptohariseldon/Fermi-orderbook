openOrdersPda #1 - Account0 -8XEh8WvAawuCwqtiCXVGu9Fdty36z6S2XXh8BjjBg8J4icon copyWritable
marketPda #2 - Account1 -EVovHAcuZ1vLdMVFRqpmcX1ezwARBr44o6WZ7wz61Tpticon copy
coinVault #3 - Account2 -5hWVevFB1gkh8SDieZmfwcPvUxLyEff7xFNEBM7VnW3Gicon copyWritable
pcVault #4 - Account3 -EVfdyMAtU5iSVrWZhmLZfm3J7zGszEsXMSsDiGArZatPicon copyWritable
coinMint#5 - Account4 -FLXU7NceNSZ1UJX4Qyx9KCwzMyQUHJw6pFnTcuWoz9zwicon copy
pcMint#6 - Account5 -9Fz25i53XBim9wKBW2gNzsuGqTm9DrtpPh7YrtoBFopRicon copy
payer#7 - Account6 -EAURXqkZ8z6aD7W64cfu2EM5Kna6AzRBVUM6FCPDRC6Vicon copyWritable
bids#8 - Account7 -EcCQzXzp7tEteQsyM9HebrXdtrX7DRXqxBZCqVX2Qpdxicon copyWritable
asks#9 - Account8 -HSc3x3bDdf6oV1pj2sftc8JeRtCYTWcb3G7T7VyN9KeUicon copyWritable
reqQ#10 - Account9 -F4aRcShYTGBRSrKmJH79m2EGy3LGhZBKBGyn2pKM9bvvicon copyWritable
eventQ #11 - Account10 -DMtsVVE7HWip14cb9qeCdmvShJSV21uBL2nDutVZzZM6icon copyWritable
authority #12 - Account11 -t49Apab6yTXpsmy8V5vQyUL9EPzDwsPsbAjet8JQQCZicon copyWritableSigner

openOrders: openOrdersPda,
market: marketPda,
coinVault,
pcVault,
coinMint: coinMint.publicKey,
pcMint: pcMint.publicKey,
payer: authorityPcTokenAccount,
bids: bidsPda,
asks: asksPda,
reqQ: reqQPda,
eventQ: eventQPda,
authority: authority.publicKey,
token_program_coin: coinMint,
