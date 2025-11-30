# Check Program ID

Run this command in your Linux environment to verify the Program ID matches:

```bash
# Get the Program ID from the deploy keypair
solana address -k target/deploy/predict_duel-keypair.json
```

This should output: `HYm1YuFYyje2FfQ1tLCa17QUMGAR11ZCa6HJKzHhcACD`

If it matches what's in `lib.rs` and `Anchor.toml`, you're good to go!

If it's different, you need to update:
1. `src/lib.rs` - line 3: `declare_id!("...")`
2. `Anchor.toml` - lines 8 and 11: `predict_duel = "..."`

