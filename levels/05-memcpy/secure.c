#include <stdio.h>
#include <string.h>
#include <stdlib.h>

void secure_copy(char *input, int len) {
    char buffer[16];
    int access_granted = 0;

    int safe_len = len;
    if (safe_len > (int)sizeof(buffer) - 1) safe_len = sizeof(buffer) - 1;
    memcpy(buffer, input, safe_len);
    buffer[safe_len] = '\0';

    printf("Buffer: %s\n", buffer);
    printf("access_granted is %d.\n", access_granted);
}

int main(int argc, char *argv[]) {
    if (argc < 2) { printf("Usage: %s <string>\n", argv[0]); return 1; }
    secure_copy(argv[1], (int)strlen(argv[1]));
    printf("Returned safely.\n");
    return 0;
}
