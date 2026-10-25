#include <stdio.h>
#include <string.h>

void secure_copy(char *input) {
    char buffer[16];
    strncpy(buffer, input, sizeof(buffer) - 1);
    buffer[sizeof(buffer) - 1] = '\0';
    printf("Copied: %s\n", buffer);
}

int main(int argc, char *argv[]) {
    if (argc < 2) { printf("Usage: %s <string>\n", argv[0]); return 1; }
    secure_copy(argv[1]);
    printf("Returned safely.\n");
    return 0;
}
