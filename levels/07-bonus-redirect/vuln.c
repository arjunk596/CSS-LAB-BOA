#include <stdio.h>
#include <string.h>

/* Compiled in, but never called from main() directly. The exploit's goal
   is to redirect execution here via a crafted overflow. */
void secret_win(void) {
    printf("\n*** secret_win() reached -- control flow redirected ***\n\n");
}

void vulnerable_read(char *input) {
    char buffer[16];
    strcpy(buffer, input); /* VULNERABLE, canary/PIE disabled at compile time */
    printf("Buffer: %s\n", buffer);
}

int main(int argc, char *argv[]) {
    if (argc < 2) { printf("Usage: %s <string>\n", argv[0]); return 1; }
    vulnerable_read(argv[1]);
    printf("Returned safely (no redirect).\n");
    return 0;
}
