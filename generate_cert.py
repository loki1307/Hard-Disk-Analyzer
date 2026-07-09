# -*- coding: utf-8 -*-
"""
generate_cert.py — Creates a self-signed SSL certificate for DiskSense AI.
Run once: python generate_cert.py
Produces: cert.pem  key.pem  (both gitignored)
"""
import datetime, ipaddress, pathlib
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

# ── Config ────────────────────────────────────────────────────
CERT_FILE = pathlib.Path("cert.pem")
KEY_FILE  = pathlib.Path("key.pem")
VALID_DAYS = 825          # max accepted by most browsers
LOCAL_IP   = "10.167.195.133"

def generate():
    print("[*] Generating 2048-bit RSA key...")
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME,             "IN"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME,   "Local"),
        x509.NameAttribute(NameOID.LOCALITY_NAME,            "Local"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME,        "DiskSense AI"),
        x509.NameAttribute(NameOID.COMMON_NAME,              "disksense.local"),
    ])

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.datetime.utcnow())
        .not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=VALID_DAYS))
        .add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName("localhost"),
                x509.DNSName("disksense.local"),
                x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
                x509.IPAddress(ipaddress.IPv4Address(LOCAL_IP)),
            ]),
            critical=False,
        )
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .sign(key, hashes.SHA256())
    )

    # Write private key
    KEY_FILE.write_bytes(
        key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )
    print(f"[+] Private key  -> {KEY_FILE}")

    # Write certificate
    CERT_FILE.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    print(f"[+] Certificate  -> {CERT_FILE}")
    print(f"\n[OK] Certificate valid for {VALID_DAYS} days.")
    print("     Covers: localhost | 127.0.0.1 | " + LOCAL_IP)

if __name__ == "__main__":
    generate()
