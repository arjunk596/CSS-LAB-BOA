#include <stdio.h>

void vulnerable_format(char *input) {
    char buffer[32];
    sprintf(buffer, "User: %s", input); /* VULNERABLE: no length limit on result */
    printf("%s\n", buffer);
}

int main(int argc, char *argv[]) {
    if (argc < 2) { printf("Usage: %s <string>\n", argv[0]); return 1; }
    vulnerable_format(argv[1]);
    printf("Returned safely.\n");
    return 0;
}
