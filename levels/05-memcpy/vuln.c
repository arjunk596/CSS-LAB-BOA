#include <stdio.h>
#include <string.h>
#include <stdlib.h>

void vulnerable_copy(char *input, int len) {
    char buffer[16];
    int access_granted = 0; /* sits adjacent to buffer in the stack frame */

    memcpy(buffer, input, len); /* VULNERABLE: len is caller-controlled, unchecked */
    buffer[15] = '\0';

    printf("Buffer: %s\n", buffer);
    if (access_granted != 0) {
        printf("FLAG: access_granted flipped to %d -- level 05 solved\n", access_granted);
    } else {
        printf("access_granted is still 0.\n");
    }
}

int main(int argc, char *argv[]) {
    if (argc < 2) { printf("Usage: %s <string>\n", argv[0]); return 1; }
    vulnerable_copy(argv[1], (int)strlen(argv[1]));
    printf("Returned safely.\n");
    return 0;
}
