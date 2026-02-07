import { webcrypto } from 'node:crypto'
import { Buffer } from 'node:buffer'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function base64UrlToBytes(str) {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = Buffer.from(padded, 'base64')
  return new Uint8Array(binary)
}

async function deriveKey(secret, saltBytes, iterations) {
  const keyMaterial = await webcrypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return webcrypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
}

async function decryptToString({ key, ivBytes, ciphertextBytes }) {
  const decrypted = await webcrypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    ciphertextBytes
  )
  return decoder.decode(decrypted)
}

async function main() {
  const salt = 'DnpzYR8AVLhP9gXf6Nu-Lw'
  const secret = '7UaJ95VTsY5qjH8JYWLN0r1R-fK5XDR4cN-qKeisM8o'
  const iterations = 210000

  // Test sample data from the project file
  const samples = [
    {
      id: 'UserDetailsFromApiGuard',
      iv: 'c4WqNxldb_l_X_kt',
      ciphertext: 'GqhTQnABd6dgFQNHG4DJfoe3gTuDqYI0xI9sgfLwiKDOU-i8i76oGjsZxxqP5DwUxEiryAo9F3TDEDQ0U-uoEFc0S7l0YjWKVNxs3laYSD2KzjoC4bX-_SIeemvngubRDLhbMwveyvY5jyAb_RqL1wlr_LvDdaTsUYMnSO79JeKsnr0z7s5ui0dOLnhp0tc-PDq55FoS5S8-LbiWPeoriGb76U8J7vVS4G1vUTfTQJ_f3uAXad4hcIrKW8uZEW44bOKi2G84v7ARexdEaTBI_QT1lBqlH58E8K1byY_dOhSu8JuBwjZuSweqnfaEsx3kPZdrDBH3cBGmNKvLHO5wV-N6EaWGdQNxhbTp6PvkBaK4BEyt3GO7u8u6A30EjA0xLhoLM6pPjjM69yPAb7l-znN3MVOGlhQ-7pQEs7kqUgf80QaaFUcXTRic-bXmHcvef0duDdgRHAiWwYXj3f743TiyRuhFp4m4x5xHlMyT0QA0G_N9dUpPOGXvNsCr_Rf8IVXEMJK10NrXj67y6XVW65F5Bk_EvW9rExQlDvrHw-2TPOQJdu_3qGeR6GCuWUoRoVXLPi0E2FczqC0yGe0WplMWRtJlQN4zhw9AujxdlAcw_E1FXedCw6SSOtJXg7Tq6Hs9ElpLFtvrLiS2i_cOTbJsQP7SRaB1OJh305yAZyYRerdHOI7p6sOl48AenFACBeHPgNffMswdfPOeS2zb-QGzKWZdVE1zemi4trNrZClKhupoZAJwYAQ0rxFcatKU3qCe11WEQTFNcbf-AQ8Po9P0W6h5r6x8GpzitATmyp3kb7N8Z29Z2WJsJ1cWE6G0UyWj4hB48iq8gJThjTWEET0vlENRdg9c66tx9FcGb4yvwvyJN0q6ERmREQpEXJhDeGYBXRe5gLR-pvVCDHckjAL89M8tPk6kqjkQz052TDGgnOz8XHdctrM-E8SPJ5kMK4qm0soCUldbsz8hBk-Dg7XirAjtupBwBWpq08aGs6K_YejBsOg_tWPa088jgqqCgyE40vcA2n7WVNmMuTbm-KWZCc0I_KlUCY0bBD6W1NPN5IZwKo3T4swrbj2Jpuee1G8uqAbJ1cxfSOtDLJBsYtqtb0Y9Y9mFS-aVfK-M3a8RSc3k_9A-xQWzqWMUuXVrB65zCiVSvfDfqQ8p1kWEN7ddBXsgHVQN3qqeYNXRoc2-MueyBgQaPDcgqY1GP6Ep_LFl59hwCbZlN8F-vvhyVoHyXbK4nFBELtUHVLIUT6MblACWDywAHjxbnlERA0qXNKu281W0ISsxxArx8PpIa0lm4EA04-JehYTG4To3mIyeIAkvEQfpZm-4xkhtz2SGTIoMhfXWdO6x7fM0CgGS97Acka8mfzDLxgYLORAcUkplDWnYz2OLLBBAXJ8qZ7FZ-wIzWl3KnMiqBHKiLfo0TntdWbgPDduwIvh7FZfO9MExb9HqbFMgPGLjgrNak2Eq8ira-cUrhpNsD0Mybc01jb3LoC4ldQZ8oTR65Yd4uOJ4XesmgZzWaXAXSyg4HpXNcPHaeOPIvoWPjwzs7ZzUkAGYw8ZB0BPNU5rbZC2i55w4do0CLPJRC-karPBxbHh1CpU7ahiX9x0OxW03NKc2ggMJjzxgxdQttysuwpVMYE2ZckmVoUJ85JUHg4euKbCT25Ed52jRyAE9Vl6t-K7bzTtnYSrW7xZ9JxEU6HRFHhHeubQBSqJcu57I8b6Xso9_7ni2sXLQhxyOeY6ltDRmzVC3q7o7-SGXm1rWcnDT0A_mmKpkNBfJyeUnLDma9z0CJW9n8tPI5dSHx1DIQX9eUNngsvUDEB_FCAG_ju9AH_0I4-RYx6pWmPE9qcCtjOtP57h3LeExnp2ywd6j0cyG_WCga4kpIGN-1F_x6-UokFxfQtG3Zu6K2NXYGpAP22fFLc8Lb3fb1J6iGVQWmYBEH7so8ZtOSY_yYPqegEy9_-dg2q-adAWl8IP18ElC9'
    },
    {
      id: 'RtkQueryEndpoints',
      iv: 'yKYgtlTQXeDK_Igs',
      ciphertext: 'CbHsW_PxIm_w7JNy3c1MVyK--mQpZNBvoi4eGWIQhFpmx2dSxnVCoXM4y4xw8w9ht7BFq-sJPsCZyFLJywldPrASIHedGIsWx5Yg4GjNEi6ZFLXUWYnRUZVMzPNJGckPAs2AGdNJEJjKQ_piPoT-LoW4aqTzlSv4P87AIobNTkudkYx00mDfeZnZdktbF3jxfAqu_xmwzDOzv7XWegWc5eXusUFyFm1Z0N7NMZfVwKhhmp8rpLHa4zfKkc5mpctWnNRMb9eccgJ4z_l6fwpIeCWlGqVNJMsy4LFBtbKSUgHWV3xf7uuRuOha9aDR9IGv2_qaXCNJnDe_lo2zhif1Sfmpc2kgTk-n3W3rUqg3ik3tBKPYBaJrSF_rJw_jzDWmJQAwOJ5gkYNnq1WrmAvFehWL144ecm5hG-E8eQ_bOQ4MpmncK8Kyg3-7TR5j8GMxvVQmbVRNDsp80OTKVHwhqdLlfO7KmD1OirUoBRzi7zvMsHi-k6egWu222C2fut-9Zsp5YysPtYmbvce6sNMCdI8KxFqeMy4QH-GG7QXOfhNThholwBZmh0NEhSiklKbO5Wpy66tNk_I3xXmCRRr2wbxd93JEvi2sdyyAE2G_nWvaej_uyLKROWpKbo0y4dfjIL1vbZP1tMuGAVZwhLpeCUYOzVGrxFhn55kvuml5Zu4JIrBs3rSYO-1-etYAk3GCmKil4dCfYhZGn8IbcdM3X5EZbfiKr3tMKukYgjYPysZqnfEWKfNL25bAHKImeeKtGDtbvcbcAx87-xXy8QO_b5C4EpuYJ41TnL3l7Fk5taiZ-Y3lsV9xmP3ibbFlcUxVyrvwNGcMi06MhMLoHopdaD_EULTHwfKwk1blfO423WzhS5M7332q8z6zXmImwNNxjNBJF4yI5IZgCq0Zutph5OpVAx24Lf17PvDZb_9lG0c7rOtm5gAuGeq3CDAaiUFKY1EoZ81gIsS4qKbUAG0UzA6sRgGo0WgAxphHGZCBKa24jMRIOGWSBNxLk18VjsGvZv5HjXsOIXkp3PP-imCdlKzvZFuZzOamQr2Il_h-VuldKEZ_50fm_PIF2GTe31Gfk9RZhFGAdAj8ygDFd8Bi7wXJDlJEms8qwaY9dxZr4cScpdxkMVrrXJXDI6CUrg96TF4kRcZ-Qv3ducitUF3RQXnPPuabY8LdlF2u3jgZn5xjYIhI-3e3zNgYGxjeszg7jH-3-_V5dmPxC9K6hSEVPgT35V6qNGpgHKFDbI-HWi1DCXHZ3SZUPhuj_aeDDsujmlvD51NRWNR59QnAlQ-HsMQJmSw5BA1M0Yf0AYTuwat5BoGbEjNkNh-vdlWsbnte4wJNnRHDfPzo7gfFKKLVYp9zdh96f6EYnjtB22c_c_obmHkwLSnLZz0KWNnJ7fXm1zxMuINis-2t9rPHdx-qqG7tIaZRiDYDHANqpfS7iEqpe231v24fqXWN_UCxXGbjeSYTql4v9emuJbmHzPVEmcq3IJNEmG_Eai83am-cyj06uxRg7A5Jb92i0ZJE86xfeivn8XXWQGBKkWezLBVdkQyUBjEawOPAJuaHjNsqxp917-jcvpwxobADK1gbRM-Sxk9Y5W3t2qVghNxIP4FJh9OlLfC_VUZtYgCAdH8rRHW7BBzcXjin09iDYXOO_F040yKbp84SLKL_8UCPFEEfW5H25svjNw9h1Ac-MhSTbyaFvrSZIF-Z5byE1fruC4nr_SUagk-tyK2l-WCLNgoyuDz_tSPH5tTI5TKJtBCvWD3av2-7zFNiUcxDLXgK3cfGorfFaa6_hYYCmtF8qX2x8UilPLQwrqhxGKaDkaf67A6DDWlNOuKYWCjP-6JtN2UAeDuble3eS6rVFVAChpfKhPI12eMxfuGOg0nTMACm5Z74Wj3nyFYJARom95TU7tQ_RmimgRbSKQE7yri5NXZiPsWyDCBzIn1B6QQdXG_l1zss2pj9xDhCfcJxjMWzv'
    }
  ]

  const key = await deriveKey(`${salt}:${secret}`, base64UrlToBytes(salt), iterations)
  console.log('Key derived successfully')

  for (const sample of samples) {
    try {
      const html = await decryptToString({
        key,
        ivBytes: base64UrlToBytes(sample.iv),
        ciphertextBytes: base64UrlToBytes(sample.ciphertext),
      })
      console.log(`\n${sample.id}: Decrypted successfully (${html.length} chars)`)
      console.log('First 200 chars:', html.substring(0, 200))
    } catch (err) {
      console.error(`\n${sample.id}: Decryption failed -`, err.message)
    }
  }
}

main()
