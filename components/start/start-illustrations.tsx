// Decorative line-art for the Start page cards. Both are hidden from
// assistive technology; the card text carries the meaning.

const stroke = {
  stroke: "#184F3A",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function AgreementIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="280"
      height="168"
      viewBox="0 0 280 168"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M196 14H108C101.373 14 96 19.3726 96 26V142C96 148.627 101.373 154 108 154H196C202.627 154 208 148.627 208 142V26C208 19.3726 202.627 14 196 14Z" fill="#FFFDF8" {...stroke} />
      <path d="M114 38H174" {...stroke} />
      <path d="M114 54H190" {...stroke} />
      <path d="M114 68H166" {...stroke} />
      <path d="M179 84H125C118.925 84 114 88.9249 114 95C114 101.075 118.925 106 125 106H179C185.075 106 190 101.075 190 95C190 88.9249 185.075 84 179 84Z" fill="#E5EDDE" {...stroke} />
      <path d="M126 95H160" {...stroke} />
      <path d="M114 132C120 122 126 140 133 129C138 121 142 136 150 127" {...stroke} />
      <path d="M206 146C214.837 146 222 138.837 222 130C222 121.163 214.837 114 206 114C197.163 114 190 121.163 190 130C190 138.837 197.163 146 206 146Z" fill="#DFF25E" {...stroke} />
      <path d="M199 130L204 135L213 125" {...stroke} strokeWidth={2} />
      <path d="M76 48H52C47.5817 48 44 51.5817 44 56V84C44 88.4183 47.5817 92 52 92H76C80.4183 92 84 88.4183 84 84V56C84 51.5817 80.4183 48 76 48Z" fill="#C9E7F0" {...stroke} />
      <path d="M44 62H84" {...stroke} />
      <path d="M54 42V52" {...stroke} />
      <path d="M74 42V52" {...stroke} />
      <path d="M56 76H72" {...stroke} />
      <path d="M30 122C32.2091 122 34 120.209 34 118C34 115.791 32.2091 114 30 114C27.7909 114 26 115.791 26 118C26 120.209 27.7909 122 30 122Z" fill="#DFF25E" stroke="#184F3A" />
      <path d="M250 45C252.761 45 255 42.7614 255 40C255 37.2386 252.761 35 250 35C247.239 35 245 37.2386 245 40C245 42.7614 247.239 45 250 45Z" fill="#DFF25E" stroke="#184F3A" />
    </svg>
  );
}

export function HouseGuideIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="280"
      height="168"
      viewBox="0 0 280 168"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M194 16H76C67.1634 16 60 23.1634 60 32V136C60 144.837 67.1634 152 76 152H194C202.837 152 210 144.837 210 136V32C210 23.1634 202.837 16 194 16Z" fill="#FFFDF8" {...stroke} />
      <path d="M125 34H83C80.2386 34 78 36.2386 78 39C78 41.7614 80.2386 44 83 44H125C127.761 44 130 41.7614 130 39C130 36.2386 127.761 34 125 34Z" fill="#DFF25E" {...stroke} />
      <path d="M78 62H190M78 78H170M78 94H182" {...stroke} />
      <path d="M180 112H90C83.3726 112 78 117.373 78 124C78 130.627 83.3726 136 90 136H180C186.627 136 192 130.627 192 124C192 117.373 186.627 112 180 112Z" fill="#E5EDDE" {...stroke} />
      <path d="M92 126C92.6518 125.335 93.4297 124.806 94.2883 124.446C95.1468 124.085 96.0687 123.899 97 123.899C97.9313 123.899 98.8532 124.085 99.7117 124.446C100.57 124.806 101.348 125.335 102 126M89 122.5C91.1451 120.423 94.014 119.261 97 119.261C99.986 119.261 102.855 120.423 105 122.5" {...stroke} />
      <path d="M114 124H174" {...stroke} />
      <path d="M246 6H200C192.268 6 186 12.268 186 20V38C186 45.732 192.268 52 200 52H246C253.732 52 260 45.732 260 38V20C260 12.268 253.732 6 246 6Z" fill="#C9E7F0" {...stroke} />
      <path d="M200 22H244M200 34H230" {...stroke} />
      <path d="M36 59C38.7614 59 41 56.7614 41 54C41 51.2386 38.7614 49 36 49C33.2386 49 31 51.2386 31 54C31 56.7614 33.2386 59 36 59Z" fill="#DFF25E" stroke="#184F3A" />
      <path d="M250 134C252.209 134 254 132.209 254 130C254 127.791 252.209 126 250 126C247.791 126 246 127.791 246 130C246 132.209 247.791 134 250 134Z" fill="#DFF25E" stroke="#184F3A" />
    </svg>
  );
}
