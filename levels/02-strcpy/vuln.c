#include <stdio.h>
#include <string.h>

void vulnerable_copy(char *input) {
    char buffer[16];
    strcpy(buffer, input); /* VULNERABLE: no bound on input length */
    printf("Copied: %s\n", buffer);
}

int main(int argc, char *argv[]) {
    if (argc < 2) { printf("Usage: %s <string>\n", argv[0]); return 1; }
    vulnerable_copy(argv[1]);
    printf("Returned safely.\n");
    return 0;
}
